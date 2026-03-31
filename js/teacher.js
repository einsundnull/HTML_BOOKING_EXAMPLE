/**
 * teacher.js — Teacher View Logic
 *
 * Grid modes: 'available' | 'timeout'
 * Recurring slots: materialised on-demand per week from app_recurring
 * No inline styles — all classes from teacher.css
 */

var currentUser  = null;

/* ══════════════════════════════════════════════════════════
   i18n — teacher namespace
   Lädt locales/teacher.json; fällt auf eingebettete Defaults zurück.
══════════════════════════════════════════════════════════ */
var _tcI18n = {};
var _TC_I18N_DEFAULTS = {
  loaderReady:          'Bereit.',
  filterStudentLabel:   'Schüler',
  filterAllStudents:    'Alle Schüler',
  filterDeselectAll:    'Alle abwählen',
  filterSelectAll:      'Alle auswählen',
  emptyBookingsFilter:  'Keine Buchungen für diesen Filter.',
  emptyStudentSearch:   'Kein Schüler gefunden.',
  emptyBookings:        'Noch keine Buchungen.',
  btnWeekView:          'Wochenansicht',
  hintSelectDay:        'Tag auswählen.',
  emptyDaySlots:        'Keine Slots für diesen Tag.',
  labelSelectStudent:   'Schüler wählen\u2026',
  btnCheck:             'Prüfen',
  btnChecking:          '\u2026',
  svgridEmptyStudent:   'Kein Schüler gefunden',
  colTime:              'Zeit',
  emptyDaySlotsLong:    'Keine Slots für diesen Tag. Öffne die Wochenansicht um Slots hinzuzufügen.',
  btnOpenWeekView:      'Wochenansicht öffnen',
  emptySlotHint:        'Kein Slot angelegt',
  groupLabel:           'Gruppenunterricht',
  groupFreePrefix:      'Noch ',
  groupFreePlural:      'freie Plätze',
  groupFreeSingular:    'freier Platz',
  newOnlyStudentLabel:  'Schüler ohne bisherige Buchung',
  gridVisStudentLabel:  'Schüler:',
  gridVisNoStudents:    'Kein Schüler gefunden'
};

function _tcT(key) {
  if (_tcI18n && _tcI18n[key]) return _tcI18n[key];
  return _TC_I18N_DEFAULTS[key] || key;
}

function _tcLoadI18n(cb) {
  var v   = typeof APP_VERSION !== 'undefined' ? ('?v=' + APP_VERSION) : '';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', './locales/teacher.json' + v);
  xhr.onload  = function() {
    try { _tcI18n = JSON.parse(xhr.responseText); } catch(e) { _tcI18n = {}; }
    cb();
  };
  xhr.onerror = function() { _tcI18n = {}; cb(); };
  xhr.send();
}

/* ══════════════════════════════════════════════════════════
   PAGE LOADER — singleton that controls the #page-loader overlay.
   PageLoader.done() is called once after the initial render cycle
   completes. Progress advances automatically until done() is called.
   _showError() uses Toast so errors during load are always visible.
══════════════════════════════════════════════════════════ */
var PageLoader = (function() {
  'use strict';

  var _el       = null;
  var _progEl   = null;
  var _labelEl  = null;
  var _prog     = 0;
  var _timer    = null;
  var _done     = false;
  var _initDone = false;

  /* Status labels keyed by minimum progress % */
  var _LABELS = [
    { at: 0,  text: 'Kalender wird geladen…' },
    { at: 30, text: 'Wiederkehrende Slots werden berechnet…' },
    { at: 60, text: 'Währungsdaten werden geladen…' },
    { at: 85, text: 'Buchungen werden geladen…' },
    { at: 95, text: 'Fast fertig…' }
  ];

  function _showError(context, err) {
    /* Errors during load are shown via Toast after loader dismisses */
    if (typeof Toast !== 'undefined') {
      Toast.error('[PageLoader:' + context + '] ' + (err && err.message ? err.message : String(err)));
    }
  }

  function _updateLabel() {
    if (!_labelEl) return;
    for (var i = _LABELS.length - 1; i >= 0; i--) {
      if (_prog >= _LABELS[i].at) { _labelEl.textContent = _LABELS[i].text; break; }
    }
  }

  function _tick() {
    if (_done) return;
    /* Non-linear: fast start → slows → stalls at 92 until done() */
    var step = _prog < 40 ? 4 : _prog < 70 ? 2.5 : _prog < 88 ? 1 : 0.3;
    _prog = Math.min(_prog + step, 92);
    if (_progEl) _progEl.style.width = _prog + '%';
    _updateLabel();
    _timer = setTimeout(_tick, 80);
  }

  function _init() {
    try {
      _el      = document.getElementById('page-loader');
      _progEl  = document.getElementById('pl-progress');
      _labelEl = document.getElementById('pl-label');
      if (!_el) return; /* loader not present on this page */
      _initDone = true;
      _tick();
    } catch(e) { _showError('init', e); }
  }

  function done() {
    try {
      if (_done) return;
      _done = true;
      clearTimeout(_timer);
      if (!_el) { _el = document.getElementById('page-loader'); }
      if (!_el) return;
      /* Jump progress to 100 */
      if (_progEl) _progEl.style.width = '100%';
      if (_labelEl) _labelEl.textContent = _tcT('loaderReady');
      /* Short pause so 100% is visible, then fade out */
      setTimeout(function() {
        try {
          _el.classList.add('is-hiding');
          setTimeout(function() {
            try { _el.classList.add('is-gone'); } catch(e2) { _showError('hide', e2); }
          }, 300);
        } catch(e) { _showError('fadeout', e); }
      }, 100);
    } catch(e) { _showError('done', e); }
  }

  /* Auto-init as soon as DOM is ready */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _init);
    } else {
      _init();
    }
  }

  return { done: done };
}());


/* ══════════════════════════════════════════════════════════
   _runOptimistic — generic optimistic button helper.
   1. Replaces button icon with spinner immediately.
   2. Calls asyncFn(callback) — the actual AppService write.
   3. On success: calls onSuccess() which re-renders.
   4. On error:   restores original icon + shows Toast.error.
══════════════════════════════════════════════════════════ */
function _runOptimistic(btn, spinnerVariant, asyncFn, onSuccess) {
  var _savedHTML  = btn.innerHTML;
  var _savedClass = btn.className;
  /* Show spinner immediately */
  btn.innerHTML = '<span class="spinner spinner--sm spinner--' + (spinnerVariant || 'dark') + '" aria-hidden="true"></span>';
  btn.classList.add('is-pending');
  btn.disabled  = true;
  /* Defer the async call one frame so the browser paints the spinner
     before the synchronous localStorage write + re-render removes the button. */
  setTimeout(function() {
    asyncFn(function(err) {
      if (err) {
        /* Rollback on error */
        btn.innerHTML = _savedHTML;
        btn.className = _savedClass;
        btn.disabled  = false;
        Toast.error(err.message || String(err));
      } else {
        /* Success — re-render will replace the row */
        if (typeof onSuccess === 'function') onSuccess();
      }
    });
  }, 32); /* 32ms ≈ 2 frames — enough to guarantee spinner paint */
}

/* ══════════════════════════════════════════════════════════
   SLOT AVAILABILITY STAGING SYSTEM
   All availability changes (Eye, Timeout, Verfügbar etc.) are
   staged locally first. The UI shows the new state immediately
   (optimistic), but AppService is NOT called until saveSlotChanges().

   pendingSlotChanges: { slotId: { action, origStatus, origBase, newStatus, newBase, slot } }
   action: 'set-status' | 'delete' | 'create'
══════════════════════════════════════════════════════════ */
var pendingSlotChanges = {};
var _pendingRecurringDeletes = []; /* [{uid, dow, time}] — fired on saveSlotChanges */

/* Get effective slot state for rendering — applies pending overrides */
function _getEffectiveAvailSlot(storeSlot) {
  if (!storeSlot) return storeSlot;
  var p = pendingSlotChanges[storeSlot.slotId];
  if (!p) return storeSlot;
  var s = {}; for (var k in storeSlot) s[k] = storeSlot[k];
  s.status     = p.newStatus;
  s.baseStatus = p.newBase;
  s._pendingAvail = p.action;
  return s;
}

/* For "create" pending entries (no slotId yet), keyed by "date|time" */
var _pendingCreateMap = {}; /* "date|time" -> { newStatus, newBase, teacherId, date, time } */

/* ══════════════════════════════════════════════════════════
   _updateSlotRow — updates a SINGLE slot row in the day panel
   without rebuilding the entire 48-slot list.
   This is what makes staging feel instant on mobile.
   Finds the row by its UTC time data attribute and swaps it.
══════════════════════════════════════════════════════════ */
function _updateSlotRow(utcTime) {
  /* Day panel rows are built by _tdvBuildRowV1 / _tdvBuildRowV2 / _tdvBuildRow.
     We find the row by a data-time attribute we'll add, then replace it. */
  var panel = document.getElementById('day-panel');
  if (!panel) return;

  var dateStr   = selectedDate ? fmtDate(selectedDate) : null;
  if (!dateStr) return;

  /* Find the existing row for this time */
  var existing = panel.querySelector('[data-utc-time="' + utcTime + '"]');
  if (!existing) {
    /* Row not found — fall back to full re-render */
    renderDayPanel();
    return;
  }

  var isPastDay = dateStr < fmtDate(new Date());

  /* Get effective slot state (applies pending overrides) */
  var slots    = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr);
  var slotMap  = {};
  for (var si = 0; si < slots.length; si++) {
    var eff = _getEffectiveAvailSlot(slots[si]);
    slotMap[eff.time] = eff;
  }
  /* Also inject pending creates */
  for (var pk in _pendingCreateMap) {
    var pc = _pendingCreateMap[pk];
    if (pc.date === dateStr && !slotMap[pc.time]) {
      slotMap[pc.time] = { slotId: '__pending__' + pk, teacherId: currentUser.uid,
        date: pc.date, time: pc.time, status: pc.newStatus, baseStatus: pc.newBase,
        _pendingAvail: 'create' };
    }
  }

  var slot = slotMap[utcTime] || null;

  /* Build the replacement row using the active tab builder */
  var builder = (activeDayTab === 'availability')  ? _tdvBuildRowV1
               : (activeDayTab === 'availability2') ? _tdvBuildRowV2
               : _tdvBuildRow;
  var newRow = builder(slot, utcTime, dateStr, isPastDay);
  if (!newRow) return;
  newRow.setAttribute('data-utc-time', utcTime);

  existing.parentNode.replaceChild(newRow, existing);
}

function _stageSlotChange(opts, btn, spinnerVariant, onDone) {
  /*
    opts: {
      action:     'set-status' | 'delete' | 'create',
      slot:       existing slot object (for set-status/delete), or null for create,
      newStatus:  target status string,
      newBase:    target baseStatus string,
      date:       dateStr (for create),
      time:       timeStr UTC (for create)
    }
  */
  try {
    /* No spinner for staging — change is instant/local, spinner would block UX */

    if (opts.action === 'create') {
      var key = opts.date + '|' + opts.time;
      _pendingCreateMap[key] = {
        newStatus: opts.newStatus, newBase: opts.newBase,
        teacherId: currentUser.uid, date: opts.date, time: opts.time
      };
    } else {
      var slotId = opts.slot ? opts.slot.slotId : null;
      if (!slotId) return;
      /* Skip virtual pending-create slots — they're in _pendingCreateMap, not staged for set-status */
      if (typeof slotId === 'string' && slotId.indexOf('__pending__') === 0) {
        updateSlotFAB(); return;
      }
      if (pendingSlotChanges[slotId]) {
        /* Already staged — if reverting to original, cancel staging instead */
        var existing = pendingSlotChanges[slotId];
        if (opts.newStatus === existing.origStatus && opts.newBase === existing.origBase) {
          delete pendingSlotChanges[slotId];
          updateSlotFAB();
          _updateSlotRow(opts.slot ? opts.slot.time : null);
          if (typeof onDone === 'function') onDone();
          return;
        }
      }
      pendingSlotChanges[slotId] = {
        action:     opts.action,
        origStatus: opts.slot.status,
        origBase:   opts.slot.baseStatus,
        newStatus:  opts.newStatus,
        newBase:    opts.newBase,
        slot:       opts.slot
      };
    }

    updateSlotFAB();
    /* Update only the affected row — instant, no full re-render */
    var _utcTime = opts.time || (opts.slot ? opts.slot.time : null);
    if (_utcTime) {
      _updateSlotRow(_utcTime);
    } else {
      renderDayPanel();
    }
    updateSlotFAB();
    if (typeof onDone === 'function') onDone();

  } catch(e) {
    Toast.error('[staging] ' + (e.message || e));
  }
}

function updateSlotFAB() {
  var group = document.getElementById('slot-fab-group');
  if (!group) return;
  var totalChanges = Object.keys(pendingSlotChanges).length + Object.keys(_pendingCreateMap).length;
  group.classList.toggle('is-visible', totalChanges > 0);
  var badge = group.querySelector('.save-badge');
  if (badge) badge.textContent = totalChanges;
}

function updateGridFAB() {
  var btn = document.getElementById('grid-save-btn');
  if (!btn) return;
  btn.classList.toggle('is-hidden', Object.keys(gridPending).length === 0);
}

function discardSlotChanges() {
  var dismissBtn = document.getElementById('slot-dismiss-btn');

  /* Show spinner on dismiss button immediately */
  if (dismissBtn) {
    dismissBtn.disabled  = true;
    dismissBtn.innerHTML = '<span class="spinner spinner--sm spinner--light" aria-hidden="true"></span> <span>Wird zurückgesetzt…</span>';
  }

  /* Collect affected times and restores */
  var ids = Object.keys(pendingSlotChanges);
  var _affectedTimes = [];
  var _restoreTotal  = 0;
  var _restoreDone   = 0;

  for (var _di = 0; _di < ids.length; _di++) {
    var _dp = pendingSlotChanges[ids[_di]];
    if (_dp.slot && _dp.slot.time) _affectedTimes.push(_dp.slot.time);
    if (_dp.action !== 'delete') _restoreTotal++;
  }
  for (var _cpk2 in _pendingCreateMap) {
    if (_pendingCreateMap[_cpk2].time) _affectedTimes.push(_pendingCreateMap[_cpk2].time);
  }

  /* If nothing to restore — just clear and update */
  if (_restoreTotal === 0) {
    _doDiscardDone(dismissBtn, _affectedTimes);
    return;
  }

  /* Restore all staged slots, then update UI when all done */
  for (var _di2 = 0; _di2 < ids.length; _di2++) {
    (function(slotId, p) {
      if (p.action === 'delete') return;
      AppService.setSlotAvailability(slotId, p.origBase, function(e) {
        if (e) Toast.error(e.message || e);
        _restoreDone++;
        if (_restoreDone >= _restoreTotal) {
          _doDiscardDone(dismissBtn, _affectedTimes);
        }
      });
    })(ids[_di2], pendingSlotChanges[ids[_di2]]);
  }

  /* Clear pending immediately (rows still show pending state until _doDiscardDone) */
  pendingSlotChanges       = {};
  _pendingCreateMap        = {};
  _pendingRecurringDeletes = [];
  updateSlotFAB();
}

function _doDiscardDone(dismissBtn, affectedTimes) {
  /* Restore button */
  if (dismissBtn) {
    dismissBtn.disabled  = false;
    dismissBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> <span data-i18n="slotFabDiscard">Verwerfen</span>';
  }
  /* Update affected rows */
  for (var i = 0; i < affectedTimes.length; i++) {
    _updateSlotRow(affectedTimes[i]);
  }
  Toast.info('Änderungen verworfen.');
}

function saveSlotChanges() {
  var saveBtn = document.getElementById('slot-save-btn');

  /* Snapshot the pending state — user can keep making new changes
     while this batch is saving in the background */
  var ids     = Object.keys(pendingSlotChanges);
  var creates = Object.keys(_pendingCreateMap);
  var total   = ids.length + creates.length;
  if (!total) { updateSlotFAB(); return; }

  /* Capture snapshots so new changes don't interfere with this batch */
  var _batchSlots     = {};
  var _batchCreates   = {};
  var _batchRecurring = _pendingRecurringDeletes.slice();
  for (var _bi = 0; _bi < ids.length; _bi++) _batchSlots[ids[_bi]] = pendingSlotChanges[ids[_bi]];
  for (var _bci = 0; _bci < creates.length; _bci++) _batchCreates[creates[_bci]] = _pendingCreateMap[creates[_bci]];

  /* Show spinner immediately on save button — before any async work */
  if (saveBtn) {
    saveBtn.disabled  = true;
    saveBtn.innerHTML = '<span class="spinner spinner--sm spinner--light" aria-hidden="true"></span> <span>Speichert…</span>';
  }

  /* Clear pending — UI unlocked for new changes while this batch saves */
  pendingSlotChanges       = {};
  _pendingCreateMap        = {};
  _pendingRecurringDeletes = [];
  updateSlotFAB();

  var errors = [];
  var done   = 0;

  function _onOne(err) {
    if (err) errors.push(err.message || String(err));
    done++;
    if (done < total) return;
    /* All done — fire recurring deletes, restore button, re-render once */
    for (var _ri = 0; _ri < _batchRecurring.length; _ri++) {
      (function(rd) {
        AppService.deleteRecurringByDayTime(rd.uid, rd.dow, rd.time, function(e) { if (e) Toast.error(e.message||e); });
      })(_batchRecurring[_ri]);
    }
    if (saveBtn) {
      saveBtn.disabled  = false;
      saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 8l4 4L13.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> <span data-i18n="slotFabSave">Speichern</span> <span class="save-badge">0</span>';
      updateSlotFAB();
    }
    _tdvRenderSlots();
    _scheduleRender({ dayPanel: true, calendar: true, studentList: true });
    if (errors.length) {
      Toast.error(errors[0]);
    } else {
      Toast.success(total + ' Änderung' + (total !== 1 ? 'en' : '') + ' gespeichert.');
    }
  }

  /* Apply set-status / delete changes from snapshot */
  for (var i = 0; i < ids.length; i++) {
    (function(slotId) {
      var p = _batchSlots[slotId];
      if (p.action === 'delete') {
        AppService.deleteSlot(slotId, _onOne);
      } else {
        AppService.setSlotAvailability(slotId, p.newBase, _onOne);
      }
    })(ids[i]);
  }

  /* Apply create changes from snapshot */
  for (var ci = 0; ci < creates.length; ci++) {
    (function(c) {
      AppService.createSlot({
        teacherId: c.teacherId, date: c.date, time: c.time,
        _utc: true, status: c.newStatus, baseStatus: c.newBase
      }, _onOne);
    })(_batchCreates[creates[ci]]);
  }
}

/* ── Teacher display helper: UTC slot time → teacher local time string ──
   Teacher always sees their own timezone — no offset badge needed.
   Returns "HH:MM" in teacher's local TZ.
   Falls back to raw UTC if TimezoneService not available. */
function _tTeacherTime(utcTimeStr, dateStr) {
  if (!utcTimeStr) return utcTimeStr;
  if (typeof TimezoneService === 'undefined' || !currentUser) return utcTimeStr;
  var tz = TimezoneService.getUserTimezone(currentUser.uid);
  return TimezoneService.utcToLocal(utcTimeStr, dateStr || '', tz).localTime;
}

/* ── Teacher display helper: UTC end time → teacher local end time ── */
function _tTeacherEndTime(utcTimeStr, dateStr) {
  if (!utcTimeStr) return utcTimeStr;
  var localStart = _tTeacherTime(utcTimeStr, dateStr);
  return AppService.slotEndTime(localStart);
}
var viewYear     = 0;
var viewMonth    = 0;
var selectedDate = new Date(); /* Heute vorausgewählt */

var gridWeekStart    = null;
var gridMode         = 'available'; // 'available' | 'timeout' | 'visibility'
var gridPending      = {};          // { "date|time": 'available'|'timeout'|'disabled'|'remove-recurring' }
var gridVisStudents  = [];          // pre-selected student UIDs for visibility mode (from URL param)

/* ── Render debounce ──────────────────────────────────────────────────────
   Multiple calls to renderCalendar/renderDayPanel/renderStudentList within
   a single event handler often fire in the same tick. The debounce coalesces
   them into one actual DOM update per tick, eliminating redundant work.
   Usage: instead of calling render functions directly, batch them via
   _scheduleRender({ calendar:true, dayPanel:true, studentList:true }).    */
var _renderPending = { calendar: false, dayPanel: false, studentList: false, allBookings: false };
var _renderTimer   = null;

/* Track whether the initial page render has completed yet */
var _initialRenderDone = false;

function _scheduleRender(flags) {
  if (flags.calendar)    _renderPending.calendar    = true;
  if (flags.dayPanel)    _renderPending.dayPanel    = true;
  if (flags.studentList) _renderPending.studentList = true;
  if (flags.allBookings) _renderPending.allBookings = true;
  if (_renderTimer) return; /* already scheduled */
  _renderTimer = setTimeout(function() {
    _renderTimer = null;
    var p = _renderPending;
    _renderPending = { calendar: false, dayPanel: false, studentList: false, allBookings: false };
    if (p.calendar)    renderCalendar();
    if (p.dayPanel)    renderDayPanel();
    if (p.studentList) renderStudentList();
    if (p.allBookings && activeTeacherView === 'all-bookings') renderAllBookings();
    /* Dismiss page loader after the first full render cycle */
    if (!_initialRenderDone) {
      _initialRenderDone = true;
      if (typeof PageLoader !== 'undefined') PageLoader.done();
    }
  }, 0);
}

/* Preserve free-slots accordion open state across renderDayPanel calls */
var _freeSlotsBlockOpen = false;

var TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

var MONTH_NAMES = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];
var DAY_NAMES   = ['Mo','Tu','We','Th','Fr','Sa','Su'];

var GRID_START = '06:00';
var GRID_END   = '22:00';

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
window.addEventListener('load', function() {
  currentUser = Auth.require('teacher');
  if (!currentUser) return;

  /* Export functions referenced by teacher.html inline script */
  window.saveBookingChanges  = saveBookingChanges;
  window.discardBookingChanges = discardBookingChanges;
  window.saveSlotChanges     = saveSlotChanges;
  window.discardSlotChanges  = discardSlotChanges;
  window.navDay              = navDay;
  window.navMonth            = navMonth;
  window.updateJumpBtns      = updateJumpBtns;

  function _initApp() {
    Navbar.init('teacher');

    document.getElementById('prev-btn').addEventListener('click', prevMonth);
    document.getElementById('next-btn').addEventListener('click', nextMonth);
    document.getElementById('grid-close-btn').addEventListener('click', closeSlotGrid);
    document.getElementById('grid-save-btn').addEventListener('click', saveSlotGrid);
    document.getElementById('grid-prev-month').addEventListener('click', gridPrevMonth);
    document.getElementById('grid-prev-week').addEventListener('click', gridPrevWeek);
    document.getElementById('grid-next-week').addEventListener('click', gridNextWeek);
    document.getElementById('grid-next-month').addEventListener('click', gridNextMonth);
    document.getElementById('mode-btn-available').addEventListener('click', function() { setGridMode('available'); });
    document.getElementById('mode-btn-timeout').addEventListener('click', function() { setGridMode('timeout'); });
    document.getElementById('mode-btn-visibility').addEventListener('click', function() { setGridMode('visibility'); });
    _initSvgrid();

    _scheduleRender({ studentList: true, calendar: true, dayPanel: true });

    // Main view tabs
    document.getElementById('nav-schedule').addEventListener('click', function() { switchTeacherView('schedule'); });
    document.getElementById('nav-all-bookings').addEventListener('click', function() { switchTeacherView('all-bookings'); });
    document.getElementById('nav-students').addEventListener('click', function() { switchTeacherView('students'); });
    document.getElementById('nav-wallet').addEventListener('click', function() { switchTeacherView('wallet'); });
    var dashLink = document.getElementById('nav-dashboard-link');
    if (dashLink && currentUser) { dashLink.href = './dashboard.html?uid=' + encodeURIComponent(currentUser.uid); }

    // Day panel sub-tabs
    document.getElementById('day-tab-availability').addEventListener('click', function() { switchDayTab('availability'); });
    document.getElementById('day-tab-availability2').addEventListener('click', function() { switchDayTab('availability2'); });
    document.getElementById('day-tab-availability3').addEventListener('click', function() { switchDayTab('availability3'); });
    document.getElementById('day-tab-bookings').addEventListener('click', function() { switchDayTab('bookings'); });

    // Teacher Day View overlay
    _tdvInitListeners();
  }

  if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
    _tcLoadI18n(function() { CurrencyService.onReady(_initApp); });
  } else {
    _tcLoadI18n(_initApp);
  }

  /* ── URL param handler: openGrid=visibility&visStudent=UID ────────
     Triggered by "Individuelle Einstellungen" button on my-students.html.
     Opens the week grid in Sichtbarkeit mode with the student preselected. */
  (function() {
    try {
      var params     = new URLSearchParams(window.location.search);
      var openGrid   = params.get('openGrid');
      var visStudent = params.get('visStudent');
      if (openGrid === 'visibility' && visStudent) {
        var _t = setInterval(function() {
          if (!document.getElementById('slot-grid-overlay')) return;
          clearInterval(_t);

          /* gridVisStudents — consumed by _openSlotVisibilityConfig slot sheet */
          if (gridVisStudents.indexOf(visStudent) === -1) {
            gridVisStudents.push(visStudent);
          }
          /* _svgridStudents — consumed by chip row + grid cell colouring */
          if (_svgridStudents.indexOf(visStudent) === -1) {
            _svgridStudents.push(visStudent);
          }

          openSlotGrid();
          setGridMode('visibility'); /* also calls renderGridTable() */
          _renderSvgridChips();      /* show student chip in header row */
        }, 100);
      }
    } catch (e) { /* URLSearchParams unavailable — silent fail */ }
  }());
});

var activeDayTab = 'availability';

function switchDayTab(tab) {
  activeDayTab = tab;
  document.getElementById('day-tab-availability').classList.toggle('active',  tab === 'availability');
  document.getElementById('day-tab-availability2').classList.toggle('active', tab === 'availability2');
  document.getElementById('day-tab-availability3').classList.toggle('active', tab === 'availability3');
  document.getElementById('day-tab-bookings').classList.toggle('active',      tab === 'bookings');
  _scheduleRender({ dayPanel: true });
}

var activeTeacherView = 'schedule';
/* ── Single shared filter state — used by ALL three views:
      All Bookings tab, Day Panel (Buchungen tab), My Students list ── */
var bookingsFilter = {
  student:   'all',
  time:      'upcoming',
  confirmed: 'all',
  dateFrom:  '',   /* 'YYYY-MM-DD' | '' */
  dateTo:    ''    /* 'YYYY-MM-DD' | '' */
};
var allBookingsSortAsc = true; /* true = oldest→newest, false = newest→oldest */

/* Read/write helpers — always go through bookingsFilter */
/* Legacy aliases — read-only snapshots, updated via _setFilter */
var _closeBookingDropdown = null;
var _closeDdDropdown      = null; /* outside-click handler for custom dropdown */
var expandedAllBlocks  = {};


function _applyConfirmFilter(slots, confirmFilter) {
  if (confirmFilter === 'confirmed')   return slots.filter(function(s) { return !!s.confirmedAt; });
  if (confirmFilter === 'unconfirmed') return slots.filter(function(s) { return !s.confirmedAt;  });
  return slots;
}

/* Pending booking changes — staged, not yet written to Store
   { slotId: { action:'book'|'cancel', originalSlot:{...}, newStudentId:uid|null } } */
var pendingBookings  = {};
var pendingMoveOpts  = {};   /* studentId → { reason, reasonLabel, note } from move dialog */

/* Return effective slot — pending overrides Store */
function getEffectiveTeacherSlot(storeSlot) {
  var p = pendingBookings[storeSlot.slotId];
  if (!p) return storeSlot;
  var s = {}; for (var k in storeSlot) s[k] = storeSlot[k];
  if (p.action === 'book') {
    s.status    = 'booked';
    s.studentId = p.newStudentId;
    s.students  = p.students || [p.newStudentId];
    s._pending  = 'book';
  } else {
    s.status    = storeSlot.baseStatus || 'available';
    s.studentId = null;
    s.students  = [];
    s._pending  = 'cancel';
  }
  return s;
}

function switchTeacherView(view) {
  activeTeacherView = view;
  document.getElementById('nav-schedule').classList.toggle('active',      view === 'schedule');
  document.getElementById('nav-all-bookings').classList.toggle('active',  view === 'all-bookings');
  document.getElementById('nav-students').classList.toggle('active',      view === 'students');
  document.getElementById('nav-wallet').classList.toggle('active',        view === 'wallet');
  document.getElementById('view-schedule').classList.toggle('view-hidden',      view !== 'schedule');
  document.getElementById('view-all-bookings').classList.toggle('view-hidden',  view !== 'all-bookings');
  document.getElementById('view-students').classList.toggle('view-hidden',      view !== 'students');
  document.getElementById('view-wallet').classList.toggle('view-hidden',        view !== 'wallet');
  if (view === 'all-bookings') {
    var bar    = document.getElementById('day-nav-bar');
    var header = document.getElementById('day-sticky-header');
    if (bar)    { bar.classList.remove('is-sticky'); }
    if (header) { header.classList.remove('is-sticky'); header.style.left = ''; header.style.width = ''; }
    window._dayNavStickyActive = false;
    renderAllBookings();
    setTimeout(updateJumpBtns, 200);
  }
  if (view === 'students') {
    renderStudentList();
  }
  if (view === 'schedule') {
    updateDayNavBar();
    setTimeout(updateJumpBtns, 100);
  }
  if (view === 'wallet') {
    if (typeof WalletPanel !== 'undefined') {
      WalletPanel.mount('teacher-wallet-panel', currentUser.uid);
    }
  }
}

/* ══════════════════════════════════════════════════════════
   STUDENT LIST
══════════════════════════════════════════════════════════ */

// Track which student rows are expanded
var expandedStudents = {};

/* ── Student filter: which student UIDs are checked (empty = all) ── */
var _stuFilterSelected = {}; /* { uid: true } — empty object = show all */

/* ── My Students filter state ── */
/* studentListFilter removed — replaced by shared bookingsFilter object */

function renderStudentList() {
  var selections = AppService.getSelectionsByTeacherSync(currentUser.uid);
  var container  = document.getElementById('student-list');
  var statStudentsEl = document.getElementById('stat-students');
  if (statStudentsEl) statStudentsEl.textContent = selections.length;

  if (!selections.length) {
    container.innerHTML = '<p class="text-muted" style="padding:var(--sp-3) var(--sp-4)">Noch keine Schüler.</p>';
    return;
  }

  container.innerHTML = '';
  var today = fmtDate(new Date());

  /* ── Student filter combobox — mockup-renderStudentList-studentFilter-2026-03-24_11-21 ── */
  (function() {
    var allStudents = [];
    for (var ci = 0; ci < selections.length; ci++) {
      var su = AppService.getUserSync(selections[ci].studentId);
      if (su) allStudents.push(su);
    }
    if (allStudents.length < 2) return; /* no point showing filter for 0-1 students */

    /* Init state: if empty, all are selected */
    var isAllSelected = (Object.keys(_stuFilterSelected).length === 0);

    var combo = document.createElement('div');
    combo.className = 'stu-filter-combo';

    /* Trigger */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'stu-filter-combo-trigger';

    var labelEl = document.createElement('span');
    labelEl.className = 'stu-filter-combo-label';

    var countEl = document.createElement('span');
    countEl.className = 'stu-filter-combo-count';

    var chevron = document.createElement('span');
    chevron.className = 'stu-filter-combo-chevron';
    chevron.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    trigger.appendChild(labelEl);
    trigger.appendChild(countEl);
    trigger.appendChild(chevron);

    /* Dropdown list */
    var list = document.createElement('div');
    list.className = 'stu-filter-combo-list';

    /* Header */
    var header = document.createElement('div');
    header.className = 'stu-filter-combo-header';
    var headerLbl = document.createElement('span');
    headerLbl.className = 'stu-filter-combo-header-label';
    headerLbl.textContent = _tcT('filterStudentLabel');
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'stu-filter-combo-all-btn';
    header.appendChild(headerLbl);
    header.appendChild(allBtn);
    list.appendChild(header);

    /* Update trigger label + count */
    function _updateTrigger() {
      var selKeys = Object.keys(_stuFilterSelected);
      var isAll   = selKeys.length === 0;
      if (isAll) {
        labelEl.textContent = _tcT('filterAllStudents');
        countEl.textContent = allStudents.length;
        countEl.className   = 'stu-filter-combo-count is-all';
        allBtn.textContent  = _tcT('filterDeselectAll');
      } else {
        var names = selKeys.map(function(uid) { return AppService.getDisplayNameSync(uid) || uid; });
        labelEl.textContent = names.join(', ');
        countEl.textContent = selKeys.length;
        countEl.className   = 'stu-filter-combo-count';
        allBtn.textContent  = _tcT('filterSelectAll');
      }
    }

    /* Build checkbox rows */
    function _buildRows() {
      /* Remove old rows */
      var old = list.querySelectorAll('.stu-filter-check-row');
      for (var ri = 0; ri < old.length; ri++) old[ri].parentNode.removeChild(old[ri]);

      for (var si = 0; si < allStudents.length; si++) {
        (function(stu) {
          var isAllSel = Object.keys(_stuFilterSelected).length === 0;
          var checked  = isAllSel || !!_stuFilterSelected[stu.uid];

          var row = document.createElement('label');
          row.className = 'stu-filter-check-row';

          var cb = document.createElement('input');
          cb.type    = 'checkbox';
          cb.checked = checked;

          var photo = ProfileStore.getPhoto(stu.uid);
          var avatarEl = document.createElement('div');
          avatarEl.className = 'stu-filter-check-avatar';
          if (photo) {
            avatarEl.innerHTML = '<img src="' + _esc(photo) + '" alt="">';
          } else {
            var n = AppService.getDisplayNameSync(stu.uid) || stu.uid;
            avatarEl.textContent = n.charAt(0).toUpperCase();
          }

          var nameEl = document.createElement('span');
          nameEl.className = 'stu-filter-check-name';
          nameEl.textContent = AppService.getDisplayNameSync(stu.uid) || stu.uid;

          /* Count bookings for this student */
          var bCount = AppService.getSlotsByStudentSync(stu.uid)
            .filter(function(s) { return s.teacherId === currentUser.uid && s.status === 'booked'; }).length;
          var metaEl = document.createElement('span');
          metaEl.className = 'stu-filter-check-meta';
          metaEl.textContent = bCount + ' Buchung' + (bCount !== 1 ? 'en' : '');

          row.appendChild(cb);
          row.appendChild(avatarEl);
          row.appendChild(nameEl);
          row.appendChild(metaEl);

          cb.addEventListener('change', function(e) {
            e.stopPropagation();
            if (cb.checked) {
              _stuFilterSelected[stu.uid] = true;
            } else {
              delete _stuFilterSelected[stu.uid];
            }
            /* If all checked, reset to "show all" */
            if (Object.keys(_stuFilterSelected).length === allStudents.length) {
              _stuFilterSelected = {};
            }
            _updateTrigger();
            renderStudentList();
          });

          list.appendChild(row);
        })(allStudents[si]);
      }
    }

    /* Select all / deselect all */
    allBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (Object.keys(_stuFilterSelected).length === 0) {
        /* Deselect all — none selected means show all, so pick first student only */
        /* Actually: "Alle abwählen" → select none = no filter, keep all visible.
           Semantics: empty = all. So button alternates between all/none */
        /* Show only first student when user clicks "Alle abwählen" — set just first */
        _stuFilterSelected = {};
        for (var ai = 0; ai < allStudents.length; ai++) {
          /* Leave empty = all, so this btn instead becomes "no filter" toggle */
        }
        /* Toggle: if all → deselect → keep first only. Actually just clear works. */
      } else {
        _stuFilterSelected = {}; /* all */
      }
      _updateTrigger();
      _buildRows();
      renderStudentList();
    });

    /* Open / close */
    function _open()  { list.classList.add('is-open'); trigger.classList.add('is-open'); }
    function _close() { list.classList.remove('is-open'); trigger.classList.remove('is-open'); }

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (list.classList.contains('is-open')) { _close(); } else { _open(); }
    });
    list.addEventListener('click', function(e) { e.stopPropagation(); });
    document.addEventListener('click', function() { _close(); });

    _updateTrigger();
    _buildRows();

    combo.appendChild(trigger);
    combo.appendChild(list);
    container.appendChild(combo);
  })();

  /* ── Search input — mockup-renderStudentList-2026-03-23_20-39 ── */
  var searchWrap = document.createElement('div');
  searchWrap.innerHTML = buildSearchInput('stu-list-search', 'Schüler suchen…');
  container.appendChild(searchWrap.firstChild);

  /* ── Filter toolbar — reuses shared helpers from ui.js ── */
  var toolbar = document.createElement('div');
  toolbar.className = 'student-filter-toolbar';

  var onRerender = function() {
    renderStudentList();
    renderDayPanel();
    if (activeTeacherView === 'all-bookings') renderAllBookings();
  };

  toolbar.appendChild(_buildTimeFilterRow(function() { onRerender(); }));

  toolbar.appendChild(_buildSortDateRangeRow(function() { onRerender(); }));

  /* Confirm filter with counts + prices */
  var todayStr  = fmtDate(new Date());
  var allBooked = AppService.getSlotsByTeacherSync(currentUser.uid)
    .filter(function(s) { return s.status === 'booked' && s.studentId; });
  if (bookingsFilter.student !== 'all') {
    allBooked = allBooked.filter(function(s) { return s.studentId === bookingsFilter.student; });
  }
  allBooked = _applyTimeFilter(allBooked, bookingsFilter.time, todayStr);
  allBooked = _applyDateRangeFilter(allBooked);
  var counts = _calcBookingBlockCounts(allBooked, todayStr, {
    mergeFn: mergeAllBookingBlocks,
    priceFn: function(s) { return parseFloat(s.price) || 0; }
  });
  toolbar.appendChild(_buildConfirmFilterRow({
    counts:   counts,
    onFilter: function() { onRerender(); }
  }));

  container.appendChild(toolbar);

  /* ── Per-student rows ── */
  var frag = document.createDocumentFragment();
  var anyVisible = false;

  /* Apply student combobox filter */
  var _stuSelKeys = Object.keys(_stuFilterSelected);
  var _stuFilterActive = _stuSelKeys.length > 0;

  for (var i = 0; i < selections.length; i++) {
    var student = AppService.getUserSync(selections[i].studentId);
    if (!student) continue;

    /* Skip if combobox filter active and student not checked */
    if (_stuFilterActive && !_stuFilterSelected[student.uid]) continue;

    var allSlots = AppService.getSlotsByStudentSync(student.uid)
      .filter(function(s) { return s.teacherId === currentUser.uid && s.status === 'booked'; })
      .sort(function(a, b) { return a.date.localeCompare(b.date) || a.time.localeCompare(b.time); });

    var filtered = _applyTimeFilter(allSlots, bookingsFilter.time, today);
    filtered = _applyDateRangeFilter(filtered);
    filtered = _applyConfirmFilter(filtered, bookingsFilter.confirmed);

    if (!filtered.length) continue;
    anyVisible = true;
    frag.appendChild(buildStudentRow(student, filtered));
  }

  if (!anyVisible) {
    var empty = document.createElement('p');
    empty.className = 'text-muted';
    empty.classList.add('empty-state-padded');
    empty.textContent = _tcT('emptyBookingsFilter');
    container.appendChild(empty);
    return;
  }

  container.appendChild(frag);

  /* ── Wire search to filter student cards by name ── */
  wireSearchInput('stu-list-search', function(query) {
    var q     = (query || '').trim().toLowerCase();
    var cards = container.querySelectorAll('.student-card');
    var found = 0;
    for (var ci = 0; ci < cards.length; ci++) {
      var nameEl = cards[ci].querySelector('.student-card-name');
      var label  = nameEl ? nameEl.textContent.toLowerCase() : '';
      var show   = !q || label.indexOf(q) !== -1;
      cards[ci].classList.toggle('is-hidden', !show);
      if (show) found++;
    }
    /* Empty state */
    var existingEmpty = container.querySelector('.stu-search-empty');
    if (existingEmpty) existingEmpty.parentNode.removeChild(existingEmpty);
    if (found === 0 && q) {
      var emptyEl = document.createElement('p');
      emptyEl.className = 'text-muted stu-search-empty';
      emptyEl.textContent = _tcT('emptyStudentSearch');
      container.appendChild(emptyEl);
    }
  });
}

function buildStudentRow(student, bookedSlots) {
  var isOpen  = !!expandedStudents[student.uid];
  var today   = fmtDate(new Date());
  var profile = (typeof ProfileStore !== 'undefined') ? AppService.getProfileOrDefaultSync(student.uid) : {};

  var counts = _calcBookingBlockCounts(bookedSlots, today, {
    mergeFn: mergeAllBookingBlocks,
    priceFn: function(s) { return parseFloat(s.price) || 0; }
  });

  /* ── Wrapper: .card like teacher card ── */
  var wrapper = document.createElement('div');
  wrapper.className = 'card student-card';

  /* ── Card top: avatar + name/subtitle + chevron ── */
  var cardTop = document.createElement('div');
  cardTop.className = 'student-card-top';
  cardTop.setAttribute('tabindex', '0');
  cardTop.setAttribute('role', 'button');

  /* Avatar — clickable → profile sheet */
  var avatarWrap = document.createElement('div');
  avatarWrap.className = 'student-card-avatar';
  avatarWrap.innerHTML = buildAvatarHTML(student.uid, { size: 'md', role: 'student' });
  (function(uid) {
    avatarWrap.addEventListener('click', function(e) {
      e.stopPropagation();
      showProfileSheet(uid);
    });
  })(student.uid);

  /* Name + subtitle */
  var nameCol = document.createElement('div');
  nameCol.className = 'student-card-name-col';

  var nameEl = document.createElement('div');
  nameEl.className  = 'student-card-name';
  nameEl.textContent = AppService.getDisplayNameSync(student.uid);
  nameCol.appendChild(nameEl);

  /* Subtitle: location or bio snippet */
  var subtitle = (profile.location || '').trim() ||
    (profile.bio ? profile.bio.trim().slice(0, 40) + (profile.bio.length > 40 ? '…' : '') : '');
  if (subtitle) {
    var subEl = document.createElement('div');
    subEl.className  = 'student-card-subtitle';
    subEl.textContent = subtitle;
    nameCol.appendChild(subEl);
  }

  /* Chevron */
  var chevron = document.createElement('span');
  chevron.className = 'student-chevron' + (isOpen ? ' is-open' : '');
  chevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ── Edit-Button → my-students.html?uid=... ── */
  var editBtn = document.createElement('a');
  editBtn.className = 'student-card-edit-btn';
  editBtn.title     = 'Preis bearbeiten';
  editBtn.href      = './my-students.html?uid=' + encodeURIComponent(currentUser.uid);
  editBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  editBtn.addEventListener('click', function(e) { e.stopPropagation(); });

  cardTop.appendChild(avatarWrap);
  cardTop.appendChild(nameCol);
  cardTop.appendChild(editBtn);
  cardTop.appendChild(chevron);

  /* ── Booking summary line ── */
  var summaryEl = document.createElement('div');
  summaryEl.className = 'student-card-summary';
  summaryEl.textContent = counts.all + ' Buchung' + (counts.all !== 1 ? 'en' : '') +
    (counts.totalAll > 0 ? ' · ' + _fmtForUser(counts.totalAll, currentUser ? currentUser.uid : null) : '');

  /* ── Badge row ── */
  var badgeRow = document.createElement('div');
  badgeRow.className = 'student-card-badges';

  var badgeDefs = [
    { label: 'Alle',         val: counts.all,         total: counts.totalAll,         cls: '' },
    { label: 'Unbest.',      val: counts.unconfirmed,  total: counts.totalUnconfirmed,  cls: 'student-card-badge--pending' },
    { label: 'Best. ✓', val: counts.confirmed,    total: counts.totalConfirmed,    cls: 'student-card-badge--confirmed' }
  ];
  badgeDefs.forEach(function(b) {
    if (b.val === 0) return;
    var chip = document.createElement('span');
    chip.className = 'student-card-badge ' + b.cls;
    var countSpan = document.createElement('span');
    countSpan.className = 'student-card-badge-count';
    countSpan.textContent = b.val;
    chip.appendChild(document.createTextNode(b.label + ' '));
    chip.appendChild(countSpan);
    if (b.total > 0) {
      var priceSpan = document.createElement('span');
      priceSpan.className = 'student-card-badge-price';
      priceSpan.textContent = ' ' + _fmtForUser(b.total, currentUser ? currentUser.uid : null);
      chip.appendChild(priceSpan);
    }
    badgeRow.appendChild(chip);
  });

  /* ── Detail panel (expandable) ── */
  var detail = document.createElement('div');
  detail.className = 'student-booking-detail' + (isOpen ? ' is-open' : '');
  if (isOpen) populateStudentBookings(detail, student, bookedSlots);

  /* ── Assemble ── */
  wrapper.appendChild(cardTop);
  wrapper.appendChild(summaryEl);
  wrapper.appendChild(badgeRow);
  wrapper.appendChild(detail);

  /* ── Toggle expand ── */
  function toggle() {
    if (expandedStudents[student.uid]) {
      delete expandedStudents[student.uid];
      chevron.classList.remove('is-open');
      detail.classList.remove('is-open');
      detail.innerHTML = '';
    } else {
      expandedStudents[student.uid] = true;
      chevron.classList.add('is-open');
      detail.classList.add('is-open');
      populateStudentBookings(detail, student, bookedSlots);
    }
  }
  cardTop.addEventListener('click', toggle);
  cardTop.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') toggle(); });

  return wrapper;
}
/**
 * Merge consecutive booked slots (same date, consecutive times) into blocks.
 * Returns [{ date, start, end, slotIds[] }]
 */

function populateStudentBookings(detail, student, bookedSlots) {
  detail.innerHTML = '';

  if (!bookedSlots.length) {
    var empty = document.createElement('p');
    empty.className = 'text-muted student-bookings-empty';
    empty.textContent = _tcT('emptyBookings');
    detail.appendChild(empty);
    return;
  }

  var today = fmtDate(new Date());

  /* Group by date */
  var byDate = {};
  var dateOrder = [];
  for (var i = 0; i < bookedSlots.length; i++) {
    var d = bookedSlots[i].date;
    if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
    byDate[d].push(bookedSlots[i]);
  }
  dateOrder.sort();
  if (!allBookingsSortAsc) { dateOrder.reverse(); }

  for (var di = 0; di < dateOrder.length; di++) {
    var dateStr = dateOrder[di];
    var isPast  = dateStr < today;

    var divider = document.createElement('div');
    divider.className = 'all-bookings-day-divider student-date-divider'
      + (isPast ? ' all-bookings-day-divider-past' : '');
    var dt = new Date(dateStr + 'T00:00:00');
    divider.textContent = dt.toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    detail.appendChild(divider);

    /* mergeAllBookingBlocks — selbe Logik wie All Bookings und Day Panel */
    var blocks = mergeAllBookingBlocks(dateStr, byDate[dateStr], today);
    for (var bi = 0; bi < blocks.length; bi++) {
      detail.appendChild(buildAllBookingBlock(blocks[bi], {
        showDate: false, isPast: isPast, simpleDetail: true
      }));
    }
  }
}

/* buildBookingBlockRow removed — now uses buildBookingBlock */

/* ══════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════ */
/* Track which year-month combinations have already been materialised
   so renderCalendar() doesn't re-run the expensive purge+write on
   every call for the same month. Cleared when the user navigates months. */
var _materialisedMonths = {};

function materialiseVisibleMonth(year, month) {
  var monthKey = year + '-' + month;
  if (_materialisedMonths[monthKey]) return; /* already done — skip */
  _materialisedMonths[monthKey] = true;

  // Find all Mondays in the visible calendar grid (can span prev/next month)
  var first    = new Date(year, month, 1);
  var startDow = first.getDay(); startDow = (startDow === 0) ? 6 : startDow - 1;
  // First Monday shown = first day of month minus startDow days
  var gridStart = new Date(year, month, 1 - startDow);
  // Calendar shows up to 6 weeks = 42 days
  var seen = {};
  for (var d = 0; d < 42; d++) {
    var day = new Date(gridStart);
    day.setDate(gridStart.getDate() + d);
    // Get Monday of this day's week
    var dow = day.getDay(); dow = (dow === 0) ? 6 : dow - 1;
    var mon = new Date(day); mon.setDate(day.getDate() - dow);
    var monKey = mon.getFullYear() + '-' + mon.getMonth() + '-' + mon.getDate();
    if (seen[monKey]) continue;
    seen[monKey] = true;
    var weekDates = [];
    for (var w = 0; w < 7; w++) {
      var wd = new Date(mon); wd.setDate(mon.getDate() + w);
      weekDates.push(wd);
    }
    /* Skip if pending slot changes exist — would purge staged available slots */
    var _hasPendingNow = Object.keys(pendingSlotChanges).length > 0 || Object.keys(_pendingCreateMap).length > 0;
    if (!_hasPendingNow) {
      AppService.materialiseWeek(currentUser.uid, weekDates, function(e){if(e)Toast.error(e.message||e);});
    }
  }
}

/* Invalidate the materialise cache — called when navigating to a new month
   so recurring slots are correctly recalculated for newly-visible weeks. */
function _invalidateMaterialiseCache() {
  _materialisedMonths = {};
}

function renderCalendar() {
  document.getElementById('month-label').textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;

  // Week view button — add once
  var calHeader = document.getElementById('cal-header-actions');
  if (calHeader && !document.getElementById('week-view-btn')) {
    var wvBtn = document.createElement('button');
    wvBtn.id = 'week-view-btn';
    wvBtn.className = 'btn btn-secondary btn-sm';
    wvBtn.textContent = _tcT('btnWeekView');
    wvBtn.addEventListener('click', openSlotGrid);
    calHeader.appendChild(wvBtn);
  }

  // Materialise recurring slots for every week visible this month
  materialiseVisibleMonth(viewYear, viewMonth);

  /* Precompute which JS-weekdays (0=Sun…6=Sat) have at least one recurring
     rule for this teacher. Used for dot display on ALL calendar cells —
     avoids per-cell adapter calls and bypasses any dayOfWeek conversion
     ambiguity between stored rules and calendar rendering.
     Mapping: stored Mon-based (0=Mon…6=Sun) → JS getDay() (0=Sun,1=Mon…6=Sat) */
  var _recurringDays = {};
  (function() {
    var _monToJs = [1, 2, 3, 4, 5, 6, 0]; /* index=monBased, value=jsDay */
    if (typeof AppService.recurringExistsByDaySync === 'function') {
      for (var _mb = 0; _mb < 7; _mb++) {
        if (AppService.recurringExistsByDaySync(currentUser.uid, _mb)) {
          _recurringDays[_monToJs[_mb]] = true;
        }
      }
    }
  })();

  var grid = document.getElementById('cal-days');
  grid.innerHTML = '';

  var first    = new Date(viewYear, viewMonth, 1);
  var startDow = first.getDay();
  startDow = (startDow === 0) ? 6 : startDow - 1;
  var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  var prevDays    = new Date(viewYear, viewMonth, 0).getDate();

  for (var i = startDow - 1; i >= 0; i--) {
    (function(dayNum) {
      var date    = new Date(viewYear, viewMonth - 1, dayNum);
      var dateStr = fmtDate(date);
      var slots   = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr);
      var hasAny  = slots.length > 0 || !!_recurringDays[date.getDay()];
      var hasBook = slots.some(function(s) { return s.status === 'booked'; });
      var hasTout = slots.some(function(s) { return s.status === 'timeout'; });
      var cell = makeCell(dayNum, true, false, false, hasAny, hasBook, hasTout);
      cell.addEventListener('click', function() { openTeacherDayView(date); selectDate(date); });
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { openTeacherDayView(date); selectDate(date); }
      });
      grid.appendChild(cell);
    })(prevDays - i);
  }

  for (var d = 1; d <= daysInMonth; d++) {
    (function(day) {
      var date    = new Date(viewYear, viewMonth, day);
      var isToday = date.getTime() === TODAY.getTime();
      var isSel   = selectedDate && date.getTime() === selectedDate.getTime();
      var dateStr = fmtDate(date);
      var slots      = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr);
      var hasAny     = slots.length > 0 || !!_recurringDays[date.getDay()];
      var hasBook    = slots.some(function(s) { return s.status === 'booked'; });
      var hasTimeout = slots.some(function(s) { return s.status === 'timeout'; });

      var cell = makeCell(day, false, isToday, isSel, hasAny, hasBook, hasTimeout);
      cell.addEventListener('click', function() { openTeacherDayView(date); selectDate(date); });
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { openTeacherDayView(date); selectDate(date); }
      });
      grid.appendChild(cell);
    })(d);
  }

  var total    = startDow + daysInMonth;
  var trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (var t = 1; t <= trailing; t++) {
    (function(dayNum) {
      var date    = new Date(viewYear, viewMonth + 1, dayNum);
      var dateStr = fmtDate(date);
      var slots   = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr);
      var hasAny  = slots.length > 0 || !!_recurringDays[date.getDay()];
      var hasBook = slots.some(function(s) { return s.status === 'booked'; });
      var hasTout = slots.some(function(s) { return s.status === 'timeout'; });
      var cell = makeCell(dayNum, true, false, false, hasAny, hasBook, hasTout);
      cell.addEventListener('click', function() { openTeacherDayView(date); selectDate(date); });
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { openTeacherDayView(date); selectDate(date); }
      });
      grid.appendChild(cell);
    })(t);
  }

  updateStats();
}

function makeCell(num, otherMonth, isToday, isSelected, hasSlots, hasBooked, hasTimeout) {
  var el = document.createElement('div');
  el.className = 'cal-day';
  if (otherMonth)  el.classList.add('other-month');
  if (isToday)     el.classList.add('today');
  if (isSelected)  el.classList.add('selected');
  if (hasSlots)    el.classList.add('has-slots');
  if (hasBooked)   el.classList.add('has-booked');
  if (hasTimeout)  el.classList.add('has-timeout');
  el.textContent = num;
  return el;
}

function selectDate(date) {
  selectedDate = date;
  _scheduleRender({ calendar: true, dayPanel: true });
}

/* ══════════════════════════════════════════════════════════
   DAY PANEL
══════════════════════════════════════════════════════════ */

function renderDayPanel() {
  updateDayNavBar();
  var panel = document.getElementById('day-panel');
  panel.innerHTML = '';

  if (!selectedDate) {
    var hint = document.createElement('p');
    hint.className = 'text-muted day-panel-empty';
    hint.textContent = _tcT('hintSelectDay');
    panel.appendChild(hint);
    return;
  }

  var dateStr = fmtDate(selectedDate);

  // Materialise recurring for the week of selected date
  var selMonday = new Date(selectedDate);
  var selDow = selMonday.getDay(); selDow = (selDow === 0) ? 6 : selDow - 1;
  selMonday.setDate(selMonday.getDate() - selDow);
  var selWeekDates = [];
  for (var wi = 0; wi < 7; wi++) { var wd = new Date(selMonday); wd.setDate(wd.getDate() + wi); selWeekDates.push(wd); }
  /* Skip materialiseWeek when pending slot changes exist — it would purge staged slots */
  var _hasPendingSlots = Object.keys(pendingSlotChanges).length > 0 || Object.keys(_pendingCreateMap).length > 0;
  if (!_hasPendingSlots) {
    AppService.materialiseWeek(currentUser.uid, selWeekDates, function(e){if(e)Toast.error(e.message||e);});
  }

  var slots   = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr);

  /* Date label removed — already shown in the sticky day-nav-bar above */
  if (activeDayTab === 'availability' || activeDayTab === 'availability2' || activeDayTab === 'availability3') {
    /* Render all 24h slots inline using same _tdvBuildRow logic as Day View */
    var isPastDay = dateStr < fmtDate(new Date());

    /* Reuse shared function — same logic as Day View and Week Grid */
    var allTimes = _buildLocalOrderedUtcTimes(dateStr, currentUser ? currentUser.uid : null);

    var slotMap = {};
    for (var si2 = 0; si2 < slots.length; si2++) {
      var _eff = _getEffectiveAvailSlot(slots[si2]);
      slotMap[_eff.time] = _eff;
    }
    /* Also inject pending creates as virtual slots */
    var _dateKey = dateStr + '|';
    for (var _pk in _pendingCreateMap) {
      if (_pk.indexOf(_dateKey) === 0) {
        var _pc = _pendingCreateMap[_pk];
        if (!slotMap[_pc.time]) {
          slotMap[_pc.time] = { slotId: '__pending__' + _pk, teacherId: currentUser.uid,
            date: _pc.date, time: _pc.time, status: _pc.newStatus, baseStatus: _pc.newBase,
            _pendingAvail: 'create' };
        }
      }
    }

    /* ── Fix 2: Section labels compare against LOCAL time ── */
    var sections = [
      { label: 'Nacht',      from: '00:00', to: '05:30' },
      { label: 'Morgen',     from: '06:00', to: '09:30' },
      { label: 'Vormittag',  from: '10:00', to: '11:30' },
      { label: 'Mittag',     from: '12:00', to: '13:30' },
      { label: 'Nachmittag', from: '14:00', to: '17:30' },
      { label: 'Abend',      from: '18:00', to: '21:30' },
      { label: 'Nacht',      from: '22:00', to: '23:30' }
    ];
    var sectionRendered = {};
    var sIdx = 0;
    var frag2 = document.createDocumentFragment();

    for (var ti2 = 0; ti2 < allTimes.length; ti2++) {
      var t2 = allTimes[ti2];
      /* Compare section boundaries against LOCAL display time, not UTC */
      var _t2local = _tTeacherTime(t2, dateStr);
      for (var sc2 = sIdx; sc2 < sections.length; sc2++) {
        if (_t2local >= sections[sc2].from && _t2local <= sections[sc2].to && !sectionRendered[sc2]) {
          var lbl2 = document.createElement('div');
          lbl2.className = 'dv-section-label';
          lbl2.textContent = sections[sc2].label;
          frag2.appendChild(lbl2);
          sectionRendered[sc2] = true;
          sIdx = sc2;
          break;
        }
      }
      var _rowBuilder = (activeDayTab === 'availability')  ? _tdvBuildRowV1
                       : (activeDayTab === 'availability2') ? _tdvBuildRowV2
                       : _tdvBuildRow; /* availability3 = exact original */
      var _builtRow = _rowBuilder(slotMap[t2] || null, t2, dateStr, isPastDay);
      if (_builtRow) frag2.appendChild(_builtRow);
    }
    panel.appendChild(frag2);

  } else {
    if (!slots.length) {
      var emptyMsg = document.createElement('p');
      emptyMsg.className = 'text-muted day-panel-empty';
      emptyMsg.textContent = _tcT('emptyDaySlots');
      panel.appendChild(emptyMsg);
      return;
    }
    renderBookingsPanel(panel, slots, dateStr);
  }
}

/* ── Tab 1: Verfügbarkeit ───────────────────────────────── */
/* ── Availability panel with Add-Slots toggle (replaces old header logic) ── */

function renderAvailabilityPanel(panel, slots) {
  for (var i = 0; i < slots.length; i++) {
    panel.appendChild(buildAvailabilityCard(slots[i]));
  }
}

function buildAvailabilityCard(slot) {
  /* Delegate to _tdvBuildRow — same logic, same CSS, same sync */
  var dateStr   = fmtDate(selectedDate);
  var isPastDay = dateStr < fmtDate(new Date());
  return _tdvBuildRow(slot, slot.time, dateStr, isPastDay);
}

/* ── Tab 2: Buchungen ───────────────────────────────────── */
/* ══════════════════════════════════════════════════════════
   BOOKINGS PANEL (Tab 2)
══════════════════════════════════════════════════════════ */

// Currently open booking form slot id
var openBookFormSlotId = null;

function renderBookingsPanel(panel, slots, dateStr) {
  var today  = fmtDate(new Date());
  var isPast = dateStr < today;

  panel.innerHTML = '';

  /* ── Filter bar (student picker, time, sort, confirm) ── */
  var filterWrap = document.createElement('div');
  filterWrap.className = 'day-bookings-filters';

  var myStudents = AppService.getSelectionsByTeacherSync(currentUser.uid)
    .map(function(sel) { return AppService.getUserSync(sel.studentId); }).filter(Boolean);
  if (myStudents.length > 1) {
    filterWrap.appendChild(_buildStudentFilterRow(function() { renderDayPanel(); }));
  }

  /* ── Search field below student dropdown — mockup-renderStudentList-studentFilter-2026-03-24_11-21 ── */
  var dayBkSearchWrap = document.createElement('div');
  dayBkSearchWrap.innerHTML = buildSearchInput('day-bk-search', 'Schüler suchen…');
  filterWrap.appendChild(dayBkSearchWrap.firstChild);

  var onDayRerender = function() {
    renderDayPanel();
    if (activeTeacherView === 'students') renderStudentList();
    if (activeTeacherView === 'all-bookings') renderAllBookings();
  };

  filterWrap.appendChild(_buildTimeFilterRow(function() { onDayRerender(); }));
  filterWrap.appendChild(_buildSortDateRangeRow(function() { onDayRerender(); }));

  /* Confirm filter with per-day counts */
  var allSlotsFull = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr)
    .filter(function(s) { return s.status === 'booked' && s.studentId; });
  if (bookingsFilter.student !== 'all') {
    allSlotsFull = allSlotsFull.filter(function(s) { return s.studentId === bookingsFilter.student; });
  }
  allSlotsFull = _applyTimeFilter(allSlotsFull, bookingsFilter.time, today);
  var allBlocks    = mergeAllBookingBlocks(dateStr, allSlotsFull, today);
  var unconfBlocks = mergeAllBookingBlocks(dateStr, _applyConfirmFilter(allSlotsFull, 'unconfirmed'), today);
  var confBlocks   = mergeAllBookingBlocks(dateStr, _applyConfirmFilter(allSlotsFull, 'confirmed'),   today);
  filterWrap.appendChild(_buildConfirmFilterRow({
    counts: { all: allBlocks.length, unconfirmed: unconfBlocks.length, confirmed: confBlocks.length,
              totalAll: 0, totalUnconfirmed: 0, totalConfirmed: 0 },
    onFilter: function() { onDayRerender(); }
  }));
  panel.appendChild(filterWrap);

  /* Wire search to filter booking blocks by student name */
  wireSearchInput('day-bk-search', function(query) {
    var q = (query || '').trim().toLowerCase();
    var blocks = panel.querySelectorAll('.all-booking-block-wrapper');
    for (var _bi = 0; _bi < blocks.length; _bi++) {
      if (blocks[_bi].classList.contains('all-booking-free-wrap')) continue;
      var nameEl = blocks[_bi].querySelector('.all-booking-student-name, .all-booking-block-student');
      var name = nameEl ? nameEl.textContent.toLowerCase() : '';
      blocks[_bi].classList.toggle('is-hidden', !!q && name.indexOf(q) === -1);
    }
  });

  /* ── Free slots section (only on future days, teacher-specific) ── */
  if (!isPast) {
    var freeWrapper = document.createElement('div');
    freeWrapper.className = 'all-booking-block-wrapper';
    var freeHeader = document.createElement('div');
    freeHeader.className = 'all-booking-block-header';
    var freeLabel = document.createElement('span');
    freeLabel.className = 'all-booking-block-time';
    var freeCount = slots.filter(function(s) { return !s.studentId; }).length;
    freeLabel.textContent = freeCount + ' freie Slot' + (freeCount !== 1 ? 's' : '');
    var freeChevron = document.createElement('span');
    freeChevron.className = 'all-booking-chevron';
    freeChevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    freeHeader.appendChild(freeLabel);
    freeHeader.appendChild(freeChevron);
    var freeDetail = document.createElement('div');
    freeDetail.className = 'all-booking-block-detail';
    freeDetail.classList.add('free-detail-padded');
    if (_freeSlotsBlockOpen) {
      freeDetail.classList.add('is-open');
      freeChevron.classList.add('is-open');
    }
    populateAllBookingDetail(freeDetail, {
      student: null, dateStr: dateStr, today: today, isFullyConfirmed: false
    }, renderDayPanel, { onDismissAll: discardBookingChanges });
    freeDetail.querySelectorAll('.btn-primary').forEach(function(btn) {
      var rowEl = btn.closest('.all-booking-slot-row');
      if (!rowEl) return;
      var timeEl = rowEl.querySelector('.all-booking-slot-time');
      if (!timeEl) return;
      var time = timeEl.textContent.split('–')[0].trim();
      var rawSlot = slots.filter(function(s) { return s.time === time && !s.studentId; })[0];
      if (!rawSlot) return;
      btn.onclick = function(e) { e.stopPropagation(); buildBookingForm(rawSlot, dateStr, slots); };
    });
    freeHeader.setAttribute('tabindex', '0');
    (function(hdr, det, chv) {
      function toggle() {
        var open = det.classList.contains('is-open');
        det.classList.toggle('is-open', !open);
        chv.classList.toggle('is-open', !open);
        _freeSlotsBlockOpen = !open;
      }
      hdr.addEventListener('click', toggle);
      hdr.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') toggle(); });
    })(freeHeader, freeDetail, freeChevron);
    freeWrapper.appendChild(freeHeader);
    freeWrapper.appendChild(freeDetail);
    panel.appendChild(freeWrapper);
  }

  /* ── Booked blocks — delegate to renderAllBookingsList with date scope ── */
  var bookingsContainer = document.createElement('div');
  panel.appendChild(bookingsContainer);
  renderAllBookingsList({ container: bookingsContainer, dateFilter: dateStr });
}


function buildBookingForm(startSlot, dateStr, allSlots, _teacherOverride) {
  /* _teacherOverride = true: teacher books on any slot regardless of status.
     Called from non-available branches (empty, timeout, disabled). */
  /* Opens as a proper Modal instead of inline expansion */
  var selections = AppService.getSelectionsByTeacherSync(currentUser.uid);
  var students   = selections.map(function(s) { return AppService.getUserSync(s.studentId); }).filter(Boolean);

  if (!students.length) {
    Modal.show({
      title: 'Buchung erstellen',
      bodyHTML: '<p class="move-dialog-info">Keine Schüler zugewiesen.</p>',
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Schließen</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', function() {
      openBookFormSlotId = null; renderDayPanel();
    });
    return null;
  }

  /* Build student combobox — multi-select dropdown with search.
     No auto-selection: teacher must explicitly pick students.
     Already-booked students shown as disabled with badge. */
  var alreadyBooked = {};
  if (startSlot && startSlot.students && startSlot.students.length) {
    for (var ab = 0; ab < startSlot.students.length; ab++) {
      alreadyBooked[startSlot.students[ab]] = true;
    }
  } else if (startSlot && startSlot.studentId) {
    alreadyBooked[startSlot.studentId] = true;
  }

  /* Build dropdown items — already-booked students at top, disabled */
  var stuDropdownItemsHTML = '';
  for (var i = 0; i < students.length; i++) {
    var uid2 = students[i].uid;
    var name = AppService.getDisplayNameSync(uid2);
    if (alreadyBooked[uid2]) {
      stuDropdownItemsHTML +=
        '<li class="custom-dropdown-item bk-stu-item bk-stu-item--booked" data-uid="" data-name="' + _esc(name) + '" aria-disabled="true">' +
        _esc(name) +
        '<span class="booking-form-already-badge">✓ Bereits gebucht</span>' +
        '</li>';
    } else {
      stuDropdownItemsHTML +=
        '<li class="custom-dropdown-item bk-stu-item" data-uid="' + _esc(uid2) + '" data-name="' + _esc(name) + '" role="option" aria-selected="false">' +
        _esc(name) +
        '</li>';
    }
  }

  var stuComboHTML =
    '<div class="bk-stu-combobox" id="bk-stu-combobox">' +
      '<div class="bk-stu-combobox-trigger" id="bk-stu-trigger" role="button" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="bk-stu-combobox-label" id="bk-stu-label">Schüler wählen…</span>' +
        '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div>' +
      '<div class="bk-stu-combobox-panel is-hidden" id="bk-stu-panel">' +
        '<div class="bk-stu-combobox-search">' +
          '<input type="text" class="bk-stu-search-input" id="bk-stu-search-input" placeholder="Suchen…" autocomplete="off">' +
        '</div>' +
        '<ul class="bk-stu-combobox-list" id="bk-stu-list" role="listbox" aria-multiselectable="true">' +
          stuDropdownItemsHTML +
        '</ul>' +
      '</div>' +
      '<div class="bk-stu-chips" id="bk-stu-chips"></div>' +
    '</div>';

  var bodyHTML =
    '<div class="move-dialog">' +
      '<div class="booking-form-label">Schüler</div>' +
      stuComboHTML +
      '<div class="booking-form-time-row">' +
        '<div class="booking-form-time-col">' +
          '<div class="booking-form-label">Von</div>' +
          '<div class="custom-dropdown" id="bk-from-dd" style="min-width:0;width:100%">' +
            '<button type="button" class="custom-dropdown-trigger" id="bk-from-trigger">' +
              '<span class="custom-dropdown-label" id="bk-from-label"></span>' +
              '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<ul class="custom-dropdown-list" id="bk-from-list" role="listbox"></ul>' +
          '</div>' +
        '</div>' +
        '<div class="booking-form-time-col">' +
          '<div class="booking-form-label">Bis</div>' +
          '<div class="custom-dropdown" id="bk-until-dd" style="min-width:0;width:100%">' +
            '<button type="button" class="custom-dropdown-trigger" id="bk-until-trigger">' +
              '<span class="custom-dropdown-label" id="bk-until-label"></span>' +
              '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<ul class="custom-dropdown-list" id="bk-until-list" role="listbox"></ul>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="bk-check-result" class="bk-check-result is-hidden"></div>';

  var result = Modal.show({
    title: 'Buchung erstellen',
    bodyHTML: bodyHTML,
    footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>'
              + '<button class="btn btn-secondary" id="modal-check">Prüfen</button>'
              + '<button class="btn btn-primary is-hidden" id="modal-confirm">Buchen</button>'
  });

  /* ── Student combobox wiring ── */
  var _selectedStudents = {}; /* uid → name */

  function _updateStuLabel() {
    var label   = document.getElementById('bk-stu-label');
    var chipsEl = document.getElementById('bk-stu-chips');
    var uids    = Object.keys(_selectedStudents);
    if (!label) return;
    if (!uids.length) {
      label.textContent = _tcT('labelSelectStudent');
      if (chipsEl) chipsEl.innerHTML = '';
      return;
    }
    label.textContent = uids.length === 1
      ? _selectedStudents[uids[0]]
      : uids.length + ' Schüler gewählt';
    if (chipsEl) {
      var html = '';
      for (var _ci = 0; _ci < uids.length; _ci++) {
        html +=
          '<span class="bk-stu-chip" data-uid="' + _esc(uids[_ci]) + '">' +
          _esc(_selectedStudents[uids[_ci]]) +
          '<button class="bk-stu-chip-remove" aria-label="Entfernen" data-uid="' + _esc(uids[_ci]) + '">×</button>' +
          '</span>';
      }
      chipsEl.innerHTML = html;
      /* Wire chip remove buttons */
      var removebtns = chipsEl.querySelectorAll('.bk-stu-chip-remove');
      for (var _ri = 0; _ri < removebtns.length; _ri++) {
        (function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var uid = btn.getAttribute('data-uid');
            delete _selectedStudents[uid];
            /* Update item state in list */
            var item = document.querySelector('.bk-stu-item[data-uid="' + uid + '"]');
            if (item) item.classList.remove('is-selected');
            _updateStuLabel();
          });
        })(removebtns[_ri]);
      }
    }
  }

  var stuTrigger = document.getElementById('bk-stu-trigger');
  var stuPanel   = document.getElementById('bk-stu-panel');
  var stuList2   = document.getElementById('bk-stu-list');
  var stuSearch  = document.getElementById('bk-stu-search-input');

  if (stuTrigger && stuPanel) {
    stuTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = !stuPanel.classList.contains('is-hidden');
      stuPanel.classList.toggle('is-hidden', open);
      stuTrigger.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!open && stuSearch) { stuSearch.value = ''; stuSearch.focus(); _filterStuList(''); }
    });
  }

  function _filterStuList(q) {
    if (!stuList2) return;
    var items = stuList2.querySelectorAll('.bk-stu-item');
    q = (q || '').trim().toLowerCase();
    for (var _fi = 0; _fi < items.length; _fi++) {
      var nm = (items[_fi].getAttribute('data-name') || '').toLowerCase();
      items[_fi].classList.toggle('is-hidden', !!q && nm.indexOf(q) === -1);
    }
  }

  if (stuSearch) {
    stuSearch.addEventListener('input', function() { _filterStuList(stuSearch.value); });
  }

  if (stuList2) {
    stuList2.addEventListener('click', function(e) {
      var item = e.target.closest('.bk-stu-item');
      if (!item) return;
      if (item.getAttribute('aria-disabled') === 'true') return; /* already booked */
      var uid = item.getAttribute('data-uid');
      var nm  = item.getAttribute('data-name');
      if (!uid) return;
      if (_selectedStudents[uid]) {
        delete _selectedStudents[uid];
        item.classList.remove('is-selected');
      } else {
        _selectedStudents[uid] = nm;
        item.classList.add('is-selected');
      }
      _updateStuLabel();
    });
  }

  /* Close panel on outside click */
  document.addEventListener('click', function _stuOutsideClick(e) {
    var box = document.getElementById('bk-stu-combobox');
    if (box && !box.contains(e.target)) {
      if (stuPanel) stuPanel.classList.add('is-hidden');
      if (stuTrigger) stuTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── Custom dropdown wiring ── */
  /* Teacher-override: include all non-booked slots for time range selection.
     Normal student booking: only available/recurring slots. */
  var allUnbooked = allSlots.filter(function(s) {
    if (_teacherOverride) {
      /* Any slot that isn't already fully booked by someone else */
      var eff2 = getEffectiveTeacherSlot(s);
      return eff2.status !== 'booked' || s.slotId === (startSlot && startSlot.slotId);
    }
    var eff = getEffectiveTeacherSlot(s);
    if (eff.status === 'available' || eff.status === 'recurring') return true;
    if (pendingBookings[s.slotId] && pendingBookings[s.slotId].action === 'book') return true;
    return false;
  });

  var fromValue  = startSlot.time;
  var untilValue = '';

  var fromTrigger = document.getElementById('bk-from-trigger');
  var fromLabel   = document.getElementById('bk-from-label');
  var fromList    = document.getElementById('bk-from-list');
  var untilTrigger = document.getElementById('bk-until-trigger');
  var untilLabel   = document.getElementById('bk-until-label');
  var untilList    = document.getElementById('bk-until-list');

  /* Build a time→slot lookup for quick availability check */
  function _buildTimeMap() {
    var m = {};
    for (var xi = 0; xi < allUnbooked.length; xi++) m[allUnbooked[xi].time] = allUnbooked[xi];
    return m;
  }

  function buildUntilOptions() {
    untilList.innerHTML = '';
    untilValue = '';
    var timeMap = _buildTimeMap();
    if (!timeMap[fromValue]) { untilLabel.textContent = '—'; return; }
    /* Walk forward in 30-min steps — stop when next slot is not available */
    var cur = fromValue;
    var opts = [];
    while (timeMap[cur]) {
      var endTime = AppService.slotEndTime(cur);
      opts.push({ val: cur, label: endTime });
      cur = endTime; /* next 30-min slot */
    }
    untilValue = opts[0].val;
    untilLabel.textContent = _tTeacherTime(opts[0].label, dateStr);
    for (var oi = 0; oi < opts.length; oi++) {
      (function(o, first) {
        var li = document.createElement('li');
        li.className = 'custom-dropdown-item' + (first ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.textContent = _tTeacherTime(o.label, dateStr);
        li.addEventListener('click', function(e) {
          e.stopPropagation();
          untilValue = o.val; /* keep UTC value for slot range */
          untilLabel.textContent = _tTeacherTime(o.label, dateStr);
          untilList.querySelectorAll('.custom-dropdown-item').forEach(function(el) { el.classList.remove('is-active'); });
          li.classList.add('is-active');
          untilList.classList.remove('is-open');
          untilTrigger.classList.remove('is-open');
        });
        untilList.appendChild(li);
      })(opts[oi], oi === 0);
    }
  }

  /* Ensure fromValue is in allUnbooked — timeout/disabled slots can be clicked
     but shouldn't be the start of a booking range. Fall back to first available. */
  var _timeMapCheck = _buildTimeMap();
  if (!_timeMapCheck[fromValue] && allUnbooked.length > 0) {
    fromValue = allUnbooked[0].time;
  }

  /* Build From options */
  fromLabel.textContent = _tTeacherTime(fromValue, dateStr);
  for (var f = 0; f < allUnbooked.length; f++) {
    (function(slot) {
      var li = document.createElement('li');
      li.className = 'custom-dropdown-item' + (slot.time === fromValue ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.textContent = _tTeacherTime(slot.time, dateStr);
      li.addEventListener('click', function(e) {
        e.stopPropagation();
        fromValue = slot.time; /* keep UTC value for slot lookup */
        fromLabel.textContent = _tTeacherTime(slot.time, dateStr);
        fromList.querySelectorAll('.custom-dropdown-item').forEach(function(el) { el.classList.remove('is-active'); });
        li.classList.add('is-active');
        fromList.classList.remove('is-open');
        fromTrigger.classList.remove('is-open');
        buildUntilOptions();
      });
      fromList.appendChild(li);
    })(allUnbooked[f]);
  }

  buildUntilOptions();

  /* Toggle handlers */
  fromTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var open = fromList.classList.contains('is-open');
    fromList.classList.toggle('is-open', !open);
    fromTrigger.classList.toggle('is-open', !open);
  });
  untilTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var open = untilList.classList.contains('is-open');
    untilList.classList.toggle('is-open', !open);
    untilTrigger.classList.toggle('is-open', !open);
  });

  document.getElementById('modal-cancel').addEventListener('click', function() {
    /* Close immediately — all re-renders happen after, so the dialog
       disappears without delay. */
    result.close();
    /* Remove staging for the slot that was being edited */
    if (startSlot && startSlot.slotId && pendingBookings[startSlot.slotId]) {
      delete pendingBookings[startSlot.slotId];
    }
    openBookFormSlotId = null;
    updateBookingSaveBtn();
    /* _scheduleRender uses setTimeout(0) internally — instant close guaranteed */
    _scheduleRender({ dayPanel: true, calendar: true, studentList: true, allBookings: true });
  });

  /* ── Prüfen button — affordability check ── */
  document.getElementById('modal-check').addEventListener('click', function() {
    var selectedUids = Object.keys(_selectedStudents);
    if (!selectedUids.length) { Toast.error('Bitte mindestens einen Schüler auswählen.'); return; }
    if (!untilValue) { Toast.error('Bitte eine Endzeit wählen.'); return; }

    var checkBtn   = document.getElementById('modal-check');
    var confirmBtn = document.getElementById('modal-confirm');
    var resultDiv  = document.getElementById('bk-check-result');

    /* Count slots in range */
    var rangeSlots = allSlots.filter(function(s) {
      return s.time >= fromValue && s.time <= untilValue && !s.studentId;
    });
    var slotCount  = rangeSlots.length;
    var teacherUid = rangeSlots.length ? rangeSlots[0].teacherId : currentUser.uid;

    /* Disable check button while loading */
    checkBtn.disabled = true;
    checkBtn.textContent = _tcT('btnChecking');

    /* Bug #1 fix: check affordability for ALL selected students.
       Each student may have an individual price — compute deposit per student. */
    var fmtAmt = (typeof _fmtForUser === 'function') ? _fmtForUser : function(a) { return '\u20ac' + parseFloat(a).toFixed(2).replace('.', ','); };
    var allCanProceed = true;
    var lines = '';
    var remaining = selectedUids.length;

    function _onAllChecked() {
      if (allCanProceed) {
        resultDiv.className = 'bk-check-result bk-check-result-ok';
        confirmBtn.classList.remove('is-hidden');
        checkBtn.classList.add('is-hidden');
      } else {
        resultDiv.className = 'bk-check-result bk-check-result-warn';
        confirmBtn.classList.add('is-hidden');
      }
      resultDiv.innerHTML = lines;
      checkBtn.disabled = false;
      checkBtn.textContent = _tcT('btnCheck');
    }

    if (!selectedUids.length) {
      checkBtn.disabled = false;
      checkBtn.textContent = _tcT('btnCheck');
      return;
    }

    for (var si = 0; si < selectedUids.length; si++) {
      (function(uid2, idx) {
        var stuPrice  = AppService.getStudentPriceForTeacherSync(uid2, teacherUid);
        var stuTotal  = Math.round(stuPrice * slotCount * 100) / 100;
        AppService.calcDepositInfo(teacherUid, stuTotal, function(err, dep) {
          if (err) {
            resultDiv.className = 'bk-check-result bk-check-error';
            resultDiv.innerHTML = 'Fehler: ' + (err.message || err);
            checkBtn.disabled = false;
            checkBtn.textContent = _tcT('btnCheck');
            return;
          }
          var wallet2  = AppService.getWalletSync(uid2);
          var bal2     = wallet2 ? (parseFloat(wallet2.balance) || 0) : 0;
          var name2    = AppService.getDisplayNameSync(uid2);
          var payMode  = dep.paymentMode || 'instant';
          var reqDep   = dep.requiresDeposit !== false;
          var depAmt   = dep.depositAmount || 0;
          var rowLines = '<div class=\"bk-check-row\" style=\"margin-top:' + (idx > 0 ? '6px' : '0') + ';border-top:' + (idx > 0 ? '1px solid var(--neutral-100)' : 'none') + '\">' +
            '<span>' + _esc(name2) + '</span><strong>' + fmtAmt(bal2) + '</strong></div>';
          rowLines += '<div class=\"bk-check-row\"><span>Slots</span><strong>' + slotCount + ' \u00d7 ' + fmtAmt(stuPrice) + ' = ' + fmtAmt(stuTotal) + '</strong></div>';
          if (payMode === 'cash_on_site') {
            rowLines += '<div class=\"bk-check-ok\">\u2713 Zahlung bar vor Ort \u2014 kein Guthaben ben\u00f6tigt.</div>';
          } else if (!reqDep) {
            rowLines += '<div class=\"bk-check-ok\">\u2713 Kein Deposit erforderlich.</div>';
          } else {
            var depLabel2 = dep.depositType === 'percent'
              ? fmtAmt(depAmt) + ' (' + dep.depositPercent + '%)'
              : fmtAmt(depAmt);
            if (bal2 >= depAmt) {
              rowLines += '<div class=\"bk-check-ok\">\u2713 Deposit ' + depLabel2 + ' gedeckt.</div>';
            } else {
              var miss2 = Math.round((depAmt - bal2) * 100) / 100;
              rowLines += '<div class=\"bk-check-warn\">\u2717 ' + _esc(name2) + ': fehlt ' + fmtAmt(miss2) + ' f\u00fcr Deposit.</div>';
              allCanProceed = false;
            }
          }
          lines += rowLines;
          remaining--;
          if (remaining === 0) _onAllChecked();
        });
      })(selectedUids[si], si);
    }
  });

  document.getElementById('modal-confirm').addEventListener('click', function() {
    var selectedUids = Object.keys(_selectedStudents);
    if (!selectedUids.length) { Toast.error('Bitte mindestens einen Schüler auswählen.'); return; }
    var fromSlot = allSlots.filter(function(s) { return s.time === fromValue; })[0] || startSlot;
    openBookFormSlotId = null;
    result.close();
    executeBooking(fromSlot, untilValue, selectedUids, dateStr, allSlots);
  });

  return null;
}

function executeBooking(startSlot, untilTime, studentUids, dateStr, allSlots) {
  // Get all slots from start up to and including untilTime
  // Use effective state (pending overrides) for conflict detection
  var range = allSlots.filter(function(s) {
    return s.time >= startSlot.time && s.time <= untilTime;
  }).map(function(s) { return getEffectiveTeacherSlot(s); });

  // Check for conflicts (already booked by someone else)
  var conflicts = range.filter(function(s) {
    return s.studentId && studentUids.indexOf(s.studentId) === -1;
  });

  if (conflicts.length) {
    var conflictNames = conflicts.map(function(s) {
      var stu = AppService.getUserSync(s.studentId);
      return s.time + ' (booked by ' + AppService.getDisplayNameSync(s.studentId) + ')';
    }).join(', ');

    var result = Modal.show({
      title: 'Booking conflict',
      bodyHTML: '<p>The following slots are already booked:</p><p><strong>' + conflictNames + '</strong></p><p>Overwrite these bookings?</p>',
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Cancel</button><button class="btn btn-danger" id="modal-confirm">Overwrite</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      commitBooking(range, studentUids);
      result.close();
    });
  } else {
    commitBooking(range, studentUids);
  }
}

function commitBooking(slots, studentUids) {
  /* Stage then immediately save — no manual Save step needed for direct bookings */
  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];
    var original = AppService.getAllSlotsSync().filter(function(s) { return s.slotId === slot.slotId; })[0];
    pendingBookings[slot.slotId] = {
      action:        'book',
      originalSlot:  original,
      newStudentId:  studentUids[0],
      students:      studentUids,
      extraStudents: studentUids.slice(1)
    };
  }
  openBookFormSlotId = null;
  /* Immediately save — Buchen button is the final confirmation */
  saveBookingChanges();
}

function updateBookingSaveBtn() {
  var group = document.getElementById('booking-fab-group');
  if (!group) return;
  var keys = Object.keys(pendingBookings);
  var count = keys.length;
  var totalBookings = 0;
  for (var bi = 0; bi < keys.length; bi++) {
    var pb = pendingBookings[keys[bi]];
    if (pb && pb.action === 'book') {
      totalBookings += (pb.students ? pb.students.length : 1);
    } else {
      totalBookings += 1;
    }
  }
  group.classList.toggle('is-visible', count > 0);
  var badge = group.querySelector('.save-badge');
  if (badge) badge.textContent = totalBookings > count ? totalBookings : count;
}

function discardBookingChanges() {
  pendingBookings = {};
  openBookFormSlotId = null;
  updateBookingSaveBtn();
  _scheduleRender({ dayPanel: true, calendar: true, studentList: true, allBookings: true });
  Toast.info('Changes dismissed.');
}

function saveBookingChanges() {
  /* Guard: disable FAB immediately to prevent double-save on rapid clicks */
  var _saveBtn = document.getElementById('booking-save-btn');
  if (_saveBtn) _saveBtn.disabled = true;

  var ids          = Object.keys(pendingBookings);
  var savedChanges = {};

  /* ── Callback barrier ───────────────────────────────────────────
     pending counts every async op (book + extra-student creates + cancels).
     onAllDone() fires exactly once, does a single authoritative re-render.
  ──────────────────────────────────────────────────────────────── */
  var pending = 0;
  var errors  = [];

  function onAllDone() {
    /* Detect move pairs: a cancel + book for the same student = reschedule */
    var cancelMap = {};
    var bookMap   = {};
    var cids = Object.keys(savedChanges);
    for (var mi = 0; mi < cids.length; mi++) {
      var mp = savedChanges[cids[mi]];
      var mstu = mp.originalSlot ? (mp.action === 'book' ? mp.newStudentId : mp.originalSlot.studentId) : null;
      if (!mstu) continue;
      if (mp.action === 'cancel') cancelMap[mstu] = mp.originalSlot;
      else if (mp.action === 'book') bookMap[mstu] = mp.originalSlot;
    }
    Object.keys(cancelMap).forEach(function(stuId) {
      if (bookMap[stuId]) {
        var moveOpts = (pendingMoveOpts && pendingMoveOpts[stuId]) ? pendingMoveOpts[stuId] : {};
        var oldSlot  = cancelMap[stuId];
        var newSlot  = bookMap[stuId];
        AppService.writeMoveRecord(oldSlot, newSlot, currentUser.uid, 'teacher', function(err, result) {
          if (err) return;
          /* Notifications now fired by AppService.writeMoveRecord */
        }, moveOpts);
      }
    });

    /* Write ONE block booking TX per (student, teacher, date) group */
    var blockGroups = {};
    var cids2 = Object.keys(savedChanges);
    for (var bi = 0; bi < cids2.length; bi++) {
      var bp = savedChanges[cids2[bi]];
      if (bp.action !== 'book') continue;
      var bSlot = AppService.getAllSlotsSync().filter(function(s) { return s.slotId === cids2[bi]; })[0];
      if (!bSlot) continue;
      var bKey = (bp.newStudentId || '') + '_' + (bSlot.teacherId || '') + '_' + (bSlot.date || '');
      if (!blockGroups[bKey]) blockGroups[bKey] = { slots: [], escrows: [], stuId: bp.newStudentId, tid: bSlot.teacherId };
      blockGroups[bKey].slots.push(bSlot);
    }
    Object.keys(blockGroups).forEach(function(gKey) {
      var g = blockGroups[gKey];
      if (!g.slots.length) return;
      /* Sort slots by time so block description is correct */
      g.slots.sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
      /* Gather escrows for these slots */
      AppService.getEscrowsByStudent(g.stuId, function(err, allEsc) {
        if (!err && allEsc) {
          g.slots.forEach(function(sl) {
            for (var ei = 0; ei < allEsc.length; ei++) {
              if (allEsc[ei].slotId === sl.slotId) { g.escrows.push(allEsc[ei]); break; }
            }
          });
        }
        AppService.writeBlockBookingRecord(g.slots, g.escrows, 'teacher', function() {});
        AppService.writeBlockEscrowHold(g.slots, g.escrows, function() {});
      });
    });

    pendingBookings = {};
    updateBookingSaveBtn();
    if (_saveBtn) _saveBtn.disabled = false;
    _scheduleRender({ dayPanel: true, calendar: true, studentList: true, allBookings: true });
    if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(currentUser.uid);
    if (errors.length) {
      Toast.error(errors[0]);
    } else {
      Toast.success('Bookings saved.');
    }
  }

  /* Count total async ops first so barrier is correct */
  for (var ci = 0; ci < ids.length; ci++) {
    var cp = pendingBookings[ids[ci]];
    pending++;  /* one per slot (primary student + extras handled within) */
  }

  if (!pending) { onAllDone(); return; }

  for (var i = 0; i < ids.length; i++) {
    var p = pendingBookings[ids[i]];
    savedChanges[ids[i]] = p;
    if (p.action === 'book') {
      (function(sid, stuId, tid, extras, allStudents) {
        /* Book primary student on original slot */
        AppService.bookSlotWithEscrowSilent(sid, stuId, tid, function(e) {
          if (e) errors.push(e.message || e);
          /* Update slot.students[] to include all students — single slot record */
          if (allStudents && allStudents.length > 1) {
            AppService.updateSlot(sid, { students: allStudents }, function() {});
          }
          /* Book escrow for each extra student on the SAME slot */
          if (extras && extras.length) {
            for (var j2 = 0; j2 < extras.length; j2++) {
              (function(extraStu2) {
                AppService.createEscrowForStudent(sid, extraStu2, tid, function(escErr) {
                  if (escErr) errors.push(escErr.message || escErr);
                  if (--pending === 0) onAllDone();
                });
              })(extras[j2]);
            }
          } else {
            if (--pending === 0) onAllDone();
          }
        }, 'teacher');
      })(ids[i], p.newStudentId, p.originalSlot.teacherId, p.extraStudents || [], p.students || [p.newStudentId]);
    } else {
      (function(sid) {
        AppService.cancelSlotWithPolicy(sid, 'teacher', function(e) {
          if (e) errors.push(e.message || e);
          if (--pending === 0) onAllDone();
        });
      })(ids[i]);
    }
  }

  /* Email + Chat notifications — group booked slots by (student, date) for ONE block message */
  var emailIds  = Object.keys(savedChanges || {});
  var bookGroups = {}; /* key: stuId_date → { stu, dateLabel, slots[] } */
  for (var ei = 0; ei < emailIds.length; ei++) {
    var ep    = savedChanges[emailIds[ei]];
    var es    = ep.originalSlot;
    var stu   = AppService.getUserSync(ep.action === 'book' ? ep.newStudentId : es.studentId);
    if (!stu) continue;
    var dateObj   = new Date(es.date + 'T00:00:00');
    var dateLabel = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    var endTime   = AppService.slotEndTime(es.time);
    if (ep.action === 'book') {
      /* EmailService.onBookingCreated now fired by AppService.bookSlotWithEscrowSilent */
      /* Collect for block chat message */
      var gKey = stu.uid + '_' + es.date;
      if (!bookGroups[gKey]) bookGroups[gKey] = { stu: stu, dateLabel: dateLabel, slots: [] };
      bookGroups[gKey].slots.push({ slotId: es.slotId, time: es.time, endTime: endTime, date: es.date });
    } else {
      /* EmailService.onBookingCancelled now fired by AppService.cancelSlotWithPolicy */
    }
  }

  /* Send ONE structured booking_notification per student (all dates batched) */
  if (typeof ChatStore !== 'undefined') {
    /* Re-group by student only (drop the date from the key) */
    var notifByStu = {}; /* stuId → { stu, slotsByDate{} } */
    Object.keys(bookGroups).forEach(function(gKey) {
      var g    = bookGroups[gKey];
      var sUid = g.stu.uid;
      if (!notifByStu[sUid]) notifByStu[sUid] = { stu: g.stu, slotsByDate: {} };
      g.slots.forEach(function(sl) {
        var dKey = sl.date;
        if (!notifByStu[sUid].slotsByDate[dKey]) {
          notifByStu[sUid].slotsByDate[dKey] = { date: dKey, slots: [] };
        }
        notifByStu[sUid].slotsByDate[dKey].slots.push(sl);
      });
    });
    Object.keys(notifByStu).forEach(function(sUid) {
      var ng           = notifByStu[sUid];
      var pricePerSlot = AppService.getStudentPriceForTeacherSync(sUid, currentUser.uid);
      var blocks       = [];
      var allSlotIds   = [];
      var totalSlots   = 0;
      Object.keys(ng.slotsByDate).sort().forEach(function(dKey) {
        var dg = ng.slotsByDate[dKey];
        dg.slots.sort(function(a, b) { return a.time.localeCompare(b.time); });
        var bStart    = dg.slots[0].time;
        var bEnd      = dg.slots[dg.slots.length - 1].endTime;
        var cnt       = dg.slots.length;
        var dDateObj  = new Date(dKey + 'T00:00:00');
        var dLabel    = dDateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        var bSlotIds  = dg.slots.map(function(s) { return s.slotId; });
        var slotTimes = dg.slots.map(function(s) { return { time: s.time }; });
        blocks.push({
          date:      dKey,
          dateLabel: dLabel,
          timeStart: bStart,
          timeEnd:   bEnd,
          slotCount: cnt,
          slotIds:   bSlotIds,
          slotTimes: slotTimes,
          amount:    pricePerSlot * cnt
        });
        allSlotIds = allSlotIds.concat(bSlotIds);
        totalSlots += cnt;
      });
      if (!blocks.length) return;
      var snapshot = {
        actorId:      currentUser.uid,
        actorRole:    'teacher',
        teacherId:    currentUser.uid,
        teacherName:  AppService.getDisplayNameSync(currentUser.uid),
        studentId:    sUid,
        studentName:  AppService.getDisplayNameSync(sUid),
        currency:     'EUR',
        pricePerSlot: pricePerSlot,
        totalSlots:   totalSlots,
        totalAmount:  pricePerSlot * totalSlots,
        blocks:       blocks,
        allSlotIds:   allSlotIds
      };
      ChatStore.sendBookingNotification(currentUser.uid, sUid, snapshot);
    });
  }
}

function deleteSlot(slotId) {
  AppService.deleteSlot(slotId, function(e){if(e)Toast.error(e.message||e);});
  Toast.success('Slot removed.');
  renderDayPanel();
  renderCalendar();
}

/* ══════════════════════════════════════════════════════════
   SLOT GRID OVERLAY
══════════════════════════════════════════════════════════ */
function openSlotGrid() {
  if (!selectedDate) return;

  var monday = new Date(selectedDate);
  var dow = monday.getDay();
  dow = (dow === 0) ? 6 : dow - 1;
  monday.setDate(monday.getDate() - dow);
  gridWeekStart = monday;
  gridPending   = {};

  // Materialise recurring for this week
  AppService.materialiseWeek(currentUser.uid, getWeekDates());

  document.getElementById('slot-grid-overlay').classList.add('is-open');
  document.body.classList.add('overlay-open');

  setGridMode('available');
  renderGridTable();
}

function closeSlotGrid() {
  document.getElementById('slot-grid-overlay').classList.remove('is-open');
  document.body.classList.remove('overlay-open');
  gridPending = {};
  updateGridFAB();
  _scheduleRender({ calendar: true, dayPanel: true });
}

function saveSlotGrid() {
  flushGridPending();
  gridPending = {};
  updateGridFAB();
  Toast.success('Slots saved.');
  _scheduleRender({ calendar: true, dayPanel: true });
  // Re-render grid to reflect saved state
  AppService.materialiseWeek(currentUser.uid, getWeekDates());
  renderGridTable();
}

function gridPrevWeek() {
  flushGridPending();
  gridPending = {};
  updateGridFAB();
  gridWeekStart.setDate(gridWeekStart.getDate() - 7);
  AppService.materialiseWeek(currentUser.uid, getWeekDates());
  renderGridTable();
}

function gridNextWeek() {
  flushGridPending();
  gridPending = {};
  updateGridFAB();
  gridWeekStart.setDate(gridWeekStart.getDate() + 7);
  AppService.materialiseWeek(currentUser.uid, getWeekDates());
  renderGridTable();
}

function gridPrevMonth() {
  flushGridPending();
  gridPending = {};
  updateGridFAB();
  gridWeekStart.setMonth(gridWeekStart.getMonth() - 1);
  AppService.materialiseWeek(currentUser.uid, getWeekDates());
  renderGridTable();
}

function gridNextMonth() {
  flushGridPending();
  gridPending = {};
  updateGridFAB();
  gridWeekStart.setMonth(gridWeekStart.getMonth() + 1);
  AppService.materialiseWeek(currentUser.uid, getWeekDates());
  renderGridTable();
}

function setGridMode(mode) {
  var prevMode = gridMode;
  gridMode = mode;
  var btnAvail   = document.getElementById('mode-btn-available');
  var btnTimeout = document.getElementById('mode-btn-timeout');
  var btnVis     = document.getElementById('mode-btn-visibility');
  if (btnAvail)   btnAvail.className   = 'grid-mode-btn-full' + (mode === 'available'   ? ' active-available'   : '');
  if (btnTimeout) btnTimeout.className = 'grid-mode-btn-full' + (mode === 'timeout'     ? ' active-timeout'     : '');
  if (btnVis)     btnVis.className     = 'grid-mode-btn-full' + (mode === 'visibility'  ? ' active-visibility'  : '');

  /* Show/hide the student-chip row and legend row for visibility mode */
  var chipsRow  = document.getElementById('svgrid-chips-row');
  var legRow    = document.getElementById('svgrid-legend-row');
  var normLeg   = document.getElementById('grid-legend-row');
  if (chipsRow) chipsRow.classList.toggle('is-hidden', mode !== 'visibility');
  if (legRow)   legRow.classList.toggle('is-hidden',   mode !== 'visibility');
  if (normLeg)  normLeg.classList.toggle('is-hidden',  mode === 'visibility');

  /* Re-render grid whenever mode changes so vis-colour overlay is
     applied or removed immediately — no stale gc-vis-* classes left. */
  if (prevMode !== mode) { renderGridTable(); }
}

/* ── Student Visibility Grid (svgrid) ──────────────────────
   "+ Schüler" button opens a dropdown to pick students.
   Selected students are shown as chips; the grid cells get
   coloured green/red based on slot visibility for that student.
─────────────────────────────────────────────────────────── */
var _svgridStudents = []; /* currently selected UIDs */

function _initSvgrid() {
  var addBtn    = document.getElementById('svgrid-add-btn');
  var dropdown  = document.getElementById('svgrid-dropdown');
  var searchEl  = document.getElementById('svgrid-search');
  var listEl    = document.getElementById('svgrid-dropdown-list');
  if (!addBtn || !dropdown) return;

  /* Position and toggle dropdown */
  addBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    var isHidden = dropdown.classList.contains('is-hidden');
    if (isHidden) {
      var rect = addBtn.getBoundingClientRect();
      dropdown.style.top  = (rect.bottom + 4) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.classList.remove('is-hidden');
      addBtn.setAttribute('aria-expanded', 'true');
      _renderSvgridDropdown('');
      if (searchEl) { searchEl.value = ''; setTimeout(function(){ searchEl.focus(); }, 40); }
    } else {
      _closeSvgridDropdown();
    }
  });

  if (searchEl) {
    searchEl.addEventListener('input', function() { _renderSvgridDropdown(searchEl.value); });
    searchEl.addEventListener('click', function(e) { e.stopPropagation(); });
  }

  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('svgrid-add-wrap');
    if (wrap && !wrap.contains(e.target)) _closeSvgridDropdown();
  });
}

function _closeSvgridDropdown() {
  var dropdown = document.getElementById('svgrid-dropdown');
  var addBtn   = document.getElementById('svgrid-add-btn');
  if (dropdown) dropdown.classList.add('is-hidden');
  if (addBtn)   addBtn.setAttribute('aria-expanded', 'false');
}

function _renderSvgridDropdown(q) {
  var listEl = document.getElementById('svgrid-dropdown-list');
  if (!listEl) return;
  var sels = AppService.getSelectionsByTeacherSync(currentUser.uid) || [];
  var students = [];
  for (var i = 0; i < sels.length; i++) {
    var u = AppService.getUserSync(sels[i].studentId);
    if (u) students.push(u);
  }
  if (q) {
    students = students.filter(function(s) {
      return (AppService.getDisplayNameSync(s.uid) || '').toLowerCase().indexOf(q.toLowerCase()) !== -1;
    });
  }
  listEl.innerHTML = '';
  if (!students.length) {
    var empty = document.createElement('div');
    empty.className = 'svgrid-dropdown-empty';
    empty.textContent = _tcT('svgridEmptyStudent');
    listEl.appendChild(empty);
    return;
  }
  students.forEach(function(s) {
    var name  = AppService.getDisplayNameSync(s.uid) || s.uid;
    var init  = (name.charAt(0) || '?').toUpperCase();
    var isSel = _svgridStudents.indexOf(s.uid) !== -1;
    var row   = document.createElement('div');
    row.className = 'svgrid-dropdown-row' + (isSel ? ' is-selected' : '');
    row.innerHTML =
      '<div class="svgrid-dr-av">' + init + '</div>' +
      '<span class="svgrid-dr-name">' + name + '</span>' +
      (isSel ? '<span class="svgrid-dr-check">✓</span>' : '');
    row.addEventListener('click', function(e) {
      e.stopPropagation();
      var idx = _svgridStudents.indexOf(s.uid);
      if (idx === -1) { _svgridStudents.push(s.uid); }
      else            { _svgridStudents.splice(idx, 1); }
      _renderSvgridChips();
      _renderSvgridDropdown(document.getElementById('svgrid-search') ? document.getElementById('svgrid-search').value : '');
      renderGridTable();
    });
    listEl.appendChild(row);
  });
}

function _renderSvgridChips() {
  var chipsEl = document.getElementById('svgrid-chips');
  if (!chipsEl) return;
  chipsEl.innerHTML = '';
  _svgridStudents.forEach(function(uid) {
    var name = AppService.getDisplayNameSync(uid) || uid;
    var init = (name.charAt(0) || '?').toUpperCase();
    var chip = document.createElement('span');
    chip.className = 'svgrid-chip';
    chip.innerHTML =
      '<span class="svgrid-chip-av">' + init + '</span>' +
      '<span>' + name + '</span>' +
      '<button class="svgrid-chip-x" data-uid="' + uid + '" aria-label="Entfernen" type="button">\u00d7</button>';
    chip.querySelector('.svgrid-chip-x').addEventListener('click', function(e) {
      e.stopPropagation();
      var u = e.currentTarget.getAttribute('data-uid');
      _svgridStudents = _svgridStudents.filter(function(x) { return x !== u; });
      _renderSvgridChips();
      renderGridTable();
    });
    chipsEl.appendChild(chip);
  });
}

/* Compute visibility class for a slot cell given selected students */
function _svgridCellClass(slot, date, time) {
  if (!_svgridStudents.length || gridMode !== 'visibility') return '';
  /* Use first selected student for coloring */
  var uid = _svgridStudents[0];
  if (!slot) return 'gc-vis-hidden'; /* no slot = not visible */
  var vis     = slot.visibility || 'public';
  var visList = slot.visibilityList || [];
  var isNew   = !(AppService.getSlotsByStudentSync(uid).some(function(s) {
    return s.teacherId === currentUser.uid && (s.status === 'booked' || s.confirmedAt);
  }));
  /* Auto-blacklist check */
  var autoPromo = slot.autoPromotedStudents || [];
  if (autoPromo.indexOf(uid) !== -1) return 'gc-vis-auto-bl';
  if (vis === 'new-only')  return isNew ? 'gc-vis-new-only' : 'gc-vis-hidden';
  if (vis === 'whitelist') return visList.indexOf(uid) !== -1 ? 'gc-vis-visible' : 'gc-vis-hidden';
  if (vis === 'blacklist') return visList.indexOf(uid) !== -1 ? 'gc-vis-hidden'  : 'gc-vis-visible';
  if (vis === 'blacklist-new') {
    if (visList.indexOf(uid) !== -1) return 'gc-vis-hidden';
    if (isNew) return 'gc-vis-hidden';
    return 'gc-vis-visible';
  }
  if (slot.excludeNewStudents && isNew) return 'gc-vis-hidden';
  return 'gc-vis-visible';
}

/* ── Grid table render ────────────────────────────────────── */
function renderGridTable() {
  var weekDates = getWeekDates();

  // Update week label
  document.getElementById('grid-week-label').textContent = weekRangeLabel(weekDates);

  var container = document.getElementById('slot-grid-content');
  container.innerHTML = '';

  var table = document.createElement('table');
  table.className = 'slot-grid-table';

  // ── thead ──
  var thead = document.createElement('thead');
  var hrow  = document.createElement('tr');

  var thTime = document.createElement('th');
  thTime.className = 'grid-th-time';
  thTime.textContent = _tcT('colTime');
  hrow.appendChild(thTime);

  for (var d = 0; d < weekDates.length; d++) {
    var wd      = weekDates[d];
    var isToday = wd.getTime() === TODAY.getTime();
    var isSel   = selectedDate && wd.getTime() === selectedDate.getTime();

    var th = document.createElement('th');
    th.className = 'grid-th-day';
    if (isToday) th.classList.add('grid-th-today');
    if (isSel)   th.classList.add('grid-th-selected');

    var nameSpan = document.createElement('span');
    nameSpan.className = 'grid-day-name';
    nameSpan.textContent = DAY_NAMES[d];

    var numSpan = document.createElement('span');
    numSpan.className = 'grid-day-num';
    if (isToday) numSpan.classList.add('grid-day-today');
    numSpan.textContent = wd.getDate();

    th.appendChild(nameSpan);
    th.appendChild(numSpan);
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  // ── tbody ──
  var tbody = document.createElement('tbody');

  /* ── Same logic as Day View (availability tab):
     Build 48 UTC time strings starting at local midnight.
     Row labels = local time (00:00 .. 23:30).
     Row identity (times[t]) = UTC value for Monday's offset (used as the iteration key).
     Per-cell lookup uses localToUtc(localLabel, cellDateStr) so DST-boundary days
     (different offset than Monday) still resolve to the correct UTC slot. ── */
  var _gridTZ     = (typeof TimezoneService !== 'undefined') ? TimezoneService.getUserTimezone(currentUser.uid) : 'UTC';
  var _refDateStr = fmtDate(weekDates[0]); /* Monday as DST reference for row ordering */

  /* Reuse shared function — same logic as Day View */
  var times       = _buildLocalOrderedUtcTimes(_refDateStr, currentUser.uid);
  var localLabels = [];
  for (var gi = 0; gi < 48; gi++) {
    var _lh = gi >> 1;
    var _lm = (gi % 2) * 30;
    localLabels.push((_lh < 10 ? '0' : '') + _lh + ':' + (_lm === 0 ? '00' : '30'));
  }

  for (var t = 0; t < times.length; t++) {
    var time       = times[t];        /* UTC value for Mon-reference row */
    var localLabel = localLabels[t];  /* Local display: 00:00 .. 23:30 */
    var tr   = document.createElement('tr');

    var tdTime = document.createElement('td');
    tdTime.className = 'grid-td-time';
    tdTime.textContent = localLabel;
    tr.appendChild(tdTime);

    for (var dd = 0; dd < weekDates.length; dd++) {
      var cellDate    = weekDates[dd];
      var cellDateStr = fmtDate(cellDate);
      var dayOfWeek   = dd; // 0=Mon

      /* Convert this row's LOCAL time → UTC for this specific date.
         Each cell gets its own UTC key so DST-boundary days resolve correctly. */
      var cellUtcTime = time; /* fallback = Mon-reference UTC */
      if (typeof TimezoneService !== 'undefined') {
        var _cellConv = TimezoneService.localToUtc(localLabel, cellDateStr, _gridTZ);
        if (_cellConv.dateOffset === 0) {
          cellUtcTime = _cellConv.utcTime;
        } else {
          cellUtcTime = null; /* crosses midnight — slot belongs to adjacent date */
        }
      }

      var slot      = cellUtcTime ? AppService.slotExistsSync(currentUser.uid, cellDateStr, cellUtcTime) : null;
      /* Recurring rule stores UTC time — compare against cellUtcTime directly */
      var recurring = cellUtcTime ? AppService.recurringExistsSync(currentUser.uid, dayOfWeek, cellUtcTime) : false;

      // Determine display status
      var status     = slot ? slot.status : (recurring ? 'recurring' : 'none');
      var pendingKey = cellDateStr + '|' + (cellUtcTime || time);
      if (gridPending[pendingKey] !== undefined) {
        status = gridPending[pendingKey];
      }

      var td   = document.createElement('td');
      td.className = 'grid-td-cell';

      var cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.date      = cellDateStr;
      cell.dataset.time      = cellUtcTime || time;  /* UTC for writes */
      cell.dataset.localtime = localLabel;            /* local HH:MM for recurring lookup */
      cell.dataset.dayofweek = String(dayOfWeek);
      cell.dataset.booked    = (status === 'booked') ? '1' : '0';

      if (status === 'available' || status === 'recurring') {
        if (slot && slot.releasedAt) {
          cell.classList.add('gc-released');
        } else {
          cell.classList.add('gc-available');
        }
      }
      else if (status === 'booked')    cell.classList.add('gc-booked');
      else if (status === 'timeout')   cell.classList.add('gc-timeout');
      else                             cell.classList.add('gc-empty');

      /* ── Visibility mode overlay colouring ── */
      if (gridMode === 'visibility' && _svgridStudents.length) {
        var _visClass = _svgridCellClass(slot, cellDateStr, cellUtcTime);
        if (_visClass) cell.classList.add(_visClass);
      }

      /* ── Visibility badge dot ── */
      if (slot && _slotHasVisConfig(slot)) {
        var _dotMod = 'default';
        var _dotTitle = 'Gruppe';
        if (slot.visibility === 'new-only')          { _dotMod = 'new-only'; _dotTitle = 'Nur neue Schüler'; }
        else if (slot.visibility === 'whitelist')    { _dotMod = 'white';    _dotTitle = 'Whitelist'; }
        else if (slot.visibility === 'blacklist')    { _dotMod = 'orange';   _dotTitle = 'Blacklist'; }
        else if (slot.visibility === 'blacklist-new'){ _dotMod = 'red';      _dotTitle = 'Blacklist + Keine Neuen'; }
        else if (slot.excludeNewStudents)            { _dotMod = 'red';      _dotTitle = 'Keine neuen Schüler'; }
        if (slot.groupMax && slot.groupMax > 1)      { _dotMod = 'green'; }
        var _dot = document.createElement('span');
        _dot.className = 'gc-vis-dot gc-vis-dot--' + _dotMod;
        _dot.setAttribute('title', _dotTitle);
        cell.appendChild(_dot);
        /* Group count label */
        if (slot.groupMax && slot.groupMax > 1) {
          var _bookedCount = (slot.students && slot.students.length) ? slot.students.length : (slot.studentId ? 1 : 0);
          var _lbl = document.createElement('span');
          _lbl.className = 'gc-group-label ' + (status === 'booked' ? 'gc-group-label--booked' : 'gc-group-label--ok');
          _lbl.textContent = _bookedCount + '/' + slot.groupMax;
          cell.appendChild(_lbl);
        }
      }

      if (status !== 'booked') {
        cell.addEventListener('click', onGridCellClick);
      }

      td.appendChild(cell);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

function onGridCellClick(e) {
  var cell       = e.currentTarget;
  var date       = cell.dataset.date;
  var time       = cell.dataset.time;
  var dayOfWeek  = parseInt(cell.dataset.dayofweek, 10);
  var key        = date + '|' + time;

  var isAvailable = cell.classList.contains('gc-available') || cell.classList.contains('gc-recurring');
  var isTimeout   = cell.classList.contains('gc-timeout');
  var isEmpty     = cell.classList.contains('gc-empty');

  if (gridMode === 'available') {
    if (isAvailable) {
      // Toggle off — available (=recurring) → disabled, remove recurring rule
      gridPending[key] = 'disabled';
      cell.className = 'grid-cell gc-empty';
    } else if (isTimeout || isEmpty) {
      // Toggle on — always creates recurring rule
      gridPending[key] = 'available';
      cell.className = 'grid-cell gc-available';
    }
  } else if (gridMode === 'timeout') {
    if (isAvailable || cell.classList.contains('gc-recurring')) {
      // Check if booked
      var existingSlot = AppService.slotExistsSync(currentUser.uid, date, time);
      if (existingSlot && existingSlot.studentId) {
        // Warning: slot is booked
        var student = AppService.getUserSync(existingSlot.studentId);
        var sName   = AppService.getDisplayNameSync(existingSlot.studentId);
        var result  = Modal.show({
          title: 'Slot is booked',
          bodyHTML: '<p>This slot is booked by <strong>' + sName + '</strong>. Setting timeout will cancel their lesson.</p>',
          footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Keep booking</button><button class="btn btn-danger" id="modal-confirm">Cancel lesson & set timeout</button>'
        });
        document.getElementById('modal-cancel').addEventListener('click', result.close);
        (function(k, c, sid) {
          document.getElementById('modal-confirm').addEventListener('click', function() {
            AppService.cancelSlotWithPolicy(sid, 'teacher', function(e){if(e)Toast.error(e.message||e);});
            AppService.setSlotAvailability(sid, 'timeout', function(e){if(e)Toast.error(e.message||e);});
            gridPending[k] = 'timeout';
            c.className = 'grid-cell gc-timeout';
            renderCalendar();
            renderStudentList();
            result.close();
          });
        })(key, cell, existingSlot.slotId);
      } else {
        gridPending[key] = 'timeout';
        cell.className = 'grid-cell gc-timeout';
      }
    } else if (isTimeout) {
      // Remove timeout — restore to available/recurring
      // Rules store UTC time — compare directly against dataset.time (UTC)
      var rec2 = AppService.recurringExistsSync(currentUser.uid, dayOfWeek, time);
      gridPending[key] = rec2 ? 'available' : 'available-no-recurring';
      cell.className = 'grid-cell gc-' + (rec2 ? 'recurring' : 'available');
    }
  } else if (gridMode === 'visibility') {
    /* Visibility mode — open slot config for available/recurring slots.
       If no slot exists yet, materialise it first then open config. */
    if (isAvailable || cell.classList.contains('gc-recurring')) {
      var visSlot = AppService.slotExistsSync(currentUser.uid, date, time);
      if (visSlot) {
        _openSlotVisibilityConfig(visSlot, function() { renderGridTable(); });
      } else {
        /* Create the slot on-the-fly then open config */
        AppService.createSlot({ teacherId: currentUser.uid, date: date, time: time, _utc: true,
          status: 'available', baseStatus: 'available' }, function(err, newSlot) {
          if (err) { Toast.error(err.message || err); return; }
          if (newSlot) _openSlotVisibilityConfig(newSlot, function() { renderGridTable(); });
        });
      }
    } else {
      Toast.info('Bitte zuerst einen verfügbaren Slot erstellen.');
    }
    return; /* No gridPending change in visibility mode */
  }
  updateGridFAB();
}

function flushGridPending() {
  var keys = Object.keys(gridPending);
  for (var i = 0; i < keys.length; i++) {
    var key    = keys[i];
    var parts  = key.split('|');
    var date   = parts[0];
    var time   = parts[1];   /* UTC — used for slot operations */
    var action = gridPending[key];

    // Get dayOfWeek from date string
    var d = new Date(date + 'T00:00:00');
    var dow = d.getDay();
    dow = (dow === 0) ? 6 : dow - 1;

    /* Recurring rules store UTC time — absolute, timezone-independent.
       The slot and the rule both use the same UTC value.
       createSlot converts local→UTC internally, so we pass UTC directly
       via the _utc flag to skip the conversion. */
    var existing = AppService.slotExistsSync(currentUser.uid, date, time);

    if (action === 'available-new-recurring' || action === 'available' || action === 'available-no-recurring') {
      AppService.createRecurring(currentUser.uid, dow, time, function(e){if(e)Toast.error(e.message||e);});
      if (existing) AppService.setSlotAvailability(existing.slotId, 'available', function(e){if(e)Toast.error(e.message||e);});
      else AppService.createSlot({ teacherId: currentUser.uid, date: date, time: time, _utc: true, status: 'available', baseStatus: 'available' }, function(e){if(e)Toast.error(e.message||e);});

    } else if (action === 'timeout') {
      if (existing) AppService.setSlotAvailability(existing.slotId, 'timeout', function(e){if(e)Toast.error(e.message||e);});
      else AppService.createSlot({ teacherId: currentUser.uid, date: date, time: time, _utc: true, status: 'timeout', baseStatus: 'timeout' }, function(e){if(e)Toast.error(e.message||e);});

    } else if (action === 'disabled') {
      AppService.deleteRecurringByDayTime(currentUser.uid, dow, time, function(e){if(e)Toast.error(e.message||e);});
      if (existing && !existing.studentId) AppService.deleteSlot(existing.slotId, function(e){if(e)Toast.error(e.message||e);});

    } else if (action === 'timeout-disabled') {
      if (existing) AppService.setSlotAvailability(existing.slotId, 'timeout', function(e){if(e)Toast.error(e.message||e);});
      else AppService.createSlot({ teacherId: currentUser.uid, date: date, time: time, _utc: true, status: 'timeout' }, function(e){if(e)Toast.error(e.message||e);});
    }
  }
  gridPending = {};
}

/* ── Helpers ──────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════
   ALL BOOKINGS VIEW
══════════════════════════════════════════════════════════ */

function updateBookingSortBtn() {
  var sortBtn = document.getElementById('bookings-sort-btn');
  if (!sortBtn) return;
  sortBtn.setAttribute('aria-label', allBookingsSortAsc ? 'Älteste zuerst — umkehren' : 'Neueste zuerst — umkehren');
  sortBtn.querySelector('.sort-icon-asc').classList.toggle('is-hidden', !allBookingsSortAsc);
  sortBtn.querySelector('.sort-icon-desc').classList.toggle('is-hidden', allBookingsSortAsc);
}

function renderAllBookings() {
  var selections = AppService.getSelectionsByTeacherSync(currentUser.uid);
  var students   = selections.map(function(s) { return AppService.getUserSync(s.studentId); }).filter(Boolean);

  /* ── Build custom dropdown options ── */
  var list    = document.getElementById('bookings-student-list');
  var label   = document.getElementById('bookings-student-label');
  var trigger = document.getElementById('bookings-student-trigger');
  if (!list || !label || !trigger) return;

  var options = [{ value: 'all', text: 'Alle Schüler' }];
  for (var i = 0; i < students.length; i++) {
    options.push({ value: students[i].uid, text: AppService.getDisplayNameSync(students[i].uid) });
  }

  function setFilter(val) {
    _setFilter('student', val);
    var selected = options.filter(function(o) { return o.value === val; })[0] || options[0];
    label.textContent = selected.text;
    /* Update active state */
    var items = list.querySelectorAll('.custom-dropdown-item');
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle('is-active', items[j].getAttribute('data-value') === val);
      items[j].setAttribute('aria-selected', items[j].getAttribute('data-value') === val ? 'true' : 'false');
    }
    closeDropdown();
    renderAllBookingsList();
  }

  function openDropdown() {
    list.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('is-open');
  }

  function closeDropdown() {
    list.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('is-open');
  }

  /* Rebuild list items — mockup-bookingsStudentDropdown-2026-03-23_20-55 */
  list.innerHTML = '';

  /* Sticky search row */
  var searchLi = document.createElement('li');
  searchLi.className = 'custom-dropdown-search';
  searchLi.innerHTML = buildSearchInput('bk-stu-dropdown-search', 'Suchen…');
  list.appendChild(searchLi);

  for (var k = 0; k < options.length; k++) {
    (function(opt) {
      var li = document.createElement('li');
      li.className = 'custom-dropdown-item' + (opt.value === bookingsFilter.student ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', opt.value);
      li.setAttribute('aria-selected', opt.value === bookingsFilter.student ? 'true' : 'false');
      li.textContent = opt.text;
      li.addEventListener('click', function() { setFilter(opt.value); });
      list.appendChild(li);
    })(options[k]);
  }

  /* Wire search to filter dropdown items */
  wireSearchInput('bk-stu-dropdown-search', function(query) {
    var q     = (query || '').trim().toLowerCase();
    var items = list.querySelectorAll('.custom-dropdown-item');
    for (var fi = 0; fi < items.length; fi++) {
      var show = !q || items[fi].textContent.toLowerCase().indexOf(q) !== -1;
      items[fi].classList.toggle('is-hidden', !show);
    }
  });

  /* Inject standalone search field below the dropdown */
  var searchWrap = document.getElementById('bookings-search-wrap');
  if (searchWrap) {
    searchWrap.innerHTML = buildSearchInput('all-bookings-search', 'Schüler suchen…');
    wireSearchInput('all-bookings-search', function(query) {
      var q     = (query || '').trim().toLowerCase();
      var cards = document.querySelectorAll('#all-bookings-list .student-card');
      for (var fi = 0; fi < cards.length; fi++) {
        var name = (cards[fi].querySelector('.student-card-name') || {}).textContent || '';
        cards[fi].classList.toggle('is-hidden', !!q && name.toLowerCase().indexOf(q) === -1);
      }
    });
  }

  /* Sync label to current filter */
  var cur = options.filter(function(o) { return o.value === bookingsFilter.student; })[0] || options[0];
  label.textContent = cur.text;

  /* Toggle open/close */
  trigger.onclick = function(e) {
    e.stopPropagation();
    if (list.classList.contains('is-open')) { closeDropdown(); } else { openDropdown(); }
  };

  /* Close on outside click — rebind each time to avoid stale refs */
  document.removeEventListener('click', _closeBookingDropdown);
  _closeBookingDropdown = function() { closeDropdown(); };
  document.addEventListener('click', _closeBookingDropdown);

  // Time filter buttons — scoped to all-bookings view
  var timeBtns = document.querySelectorAll('#view-all-bookings .booking-time-btn');
  for (var t = 0; t < timeBtns.length; t++) {
    timeBtns[t].classList.toggle('active', timeBtns[t].id === 'filter-' + bookingsFilter.time);
    (function(btn) {
      btn.onclick = function() {
        _setFilter('time', btn.id.replace('filter-', ''));
        // Smart default: past → newest-first (desc), upcoming/all → oldest-first (asc)
        allBookingsSortAsc = (bookingsFilter.time !== 'past');
        for (var j = 0; j < timeBtns.length; j++) timeBtns[j].classList.remove('active');
        btn.classList.add('active');
        updateBookingSortBtn();
        _updateAllBookingsBadges();
        renderAllBookingsList();
        if (activeTeacherView === 'students') renderStudentList();
        renderDayPanel();
      };
    })(timeBtns[t]);
  }

  // Sort + date-range row — rebuilt each render so state stays fresh
  var sortDateContainer = document.getElementById('all-bookings-sort-date-row');
  if (sortDateContainer) {
    sortDateContainer.innerHTML = '';
    sortDateContainer.appendChild(_buildSortDateRangeRow(function() {
      renderAllBookingsList();
      if (activeTeacherView === 'students') renderStudentList();
      renderDayPanel();
    }));
  }

  // Confirm filter tabs — scoped to all-bookings view
  var confirmBtns = document.querySelectorAll('#view-all-bookings .booking-confirm-btn');
  for (var ci = 0; ci < confirmBtns.length; ci++) {
    confirmBtns[ci].classList.toggle('active', confirmBtns[ci].dataset.confirm === bookingsFilter.confirmed);
    (function(btn) {
      btn.onclick = function() {
        _setFilter('confirmed', btn.dataset.confirm);
        for (var cj = 0; cj < confirmBtns.length; cj++) confirmBtns[cj].classList.remove('active');
        btn.classList.add('active');
        _updateAllBookingsBadges();
        renderAllBookingsList();
        if (activeTeacherView === 'students') renderStudentList();
        renderDayPanel();
      };
    })(confirmBtns[ci]);
  }
  _updateAllBookingsBadges();

  renderAllBookingsList();
}

/* Berechnet Blockzahlen (merged) für alle drei Confirm-Filter.
 * Wird von All Bookings und Day Panel gleichermaßen verwendet. */
/* Teacher wrapper — uses mergeAllBookingBlocks (groups by studentId) */
function _calcBlockCounts(slots, today) {
  return _calcBookingBlockCounts(slots, today, { mergeFn: mergeAllBookingBlocks });
}

/* Teacher wrapper for shared badge updater */
function _updateAllBookingsBadges() {
  _updateBookingBadges({
    getSlots:    function() {
      return AppService.getSlotsByTeacherSync(currentUser.uid)
        .filter(function(s) { return s.status === 'booked' && s.studentId; });
    },
    partyField:  'studentId',
    mergeFn:     mergeAllBookingBlocks,
    priceFn:     function(s) { return parseFloat(s.price) || 0; },
    badgePrefix: '',
    containerId: 'view-all-bookings'
  });
}

function renderAllBookingsList(opts) {
  opts = opts || {};
  /* opts.container  — DOM element to render into (default: #all-bookings-list)
     opts.dateFilter — string 'YYYY-MM-DD', render only this date (default: all dates) */
  var container = opts.container || document.getElementById('all-bookings-list');
  if (!container) return;
  container.innerHTML = '';

  var today = fmtDate(new Date()); /* FIX: defined here, passed to sub-functions via block.today */

  var allSlots = AppService.getSlotsByTeacherSync(currentUser.uid)
    .filter(function(s) {
      return s.status === 'booked' && s.studentId;
    })
    .map(function(s) {
      var p = pendingBookings[s.slotId];
      if (p && p.action === 'cancel') {
        var copy = {}; for (var k in s) copy[k] = s[k];
        copy._pending = 'cancel';
        return copy;
      }
      return s;
    });

  // Filter by student
  if (bookingsFilter.student !== 'all') {
    allSlots = allSlots.filter(function(s) { return s.studentId === bookingsFilter.student; })
  }

  // Date scope — when called from renderBookingsPanel, restrict to one day
  if (opts.dateFilter) {
    allSlots = allSlots.filter(function(s) { return s.date === opts.dateFilter; });
  }

  allSlots = _applyTimeFilter(allSlots, bookingsFilter.time, today);
  if (!opts.dateFilter) { allSlots = _applyDateRangeFilter(allSlots); }
  allSlots = _applyConfirmFilter(allSlots, bookingsFilter.confirmed);

  var emptyReasons = {
    past: 'Keine vergangenen Buchungen.',
    upcoming: 'Keine kommenden Buchungen.',
    all: 'Keine Buchungen gefunden.'
  };
  if (!allSlots.length) {
    var empty = document.createElement('p');
    empty.className = 'text-muted';
    empty.textContent = emptyReasons[bookingsFilter.time] || 'Keine Buchungen gefunden.';
    container.appendChild(empty);
    return;
  }

  // Always sort ascending for correct merging — direction only affects display order
  allSlots.sort(function(a, b) {
    return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
  });

  // Group by date
  var byDate = {};
  var dateOrder = [];
  for (var i = 0; i < allSlots.length; i++) {
    var s = allSlots[i];
    if (!byDate[s.date]) { byDate[s.date] = []; dateOrder.push(s.date); }
    byDate[s.date].push(s);
  }

  if (!allBookingsSortAsc) { dateOrder.reverse(); }

  for (var d = 0; d < dateOrder.length; d++) {
    var dateStr   = dateOrder[d];
    var dateSlots = byDate[dateStr];
    var isPast    = dateStr < today;

    var divider = document.createElement('div');
    divider.className = 'all-bookings-day-divider' + (isPast ? ' all-bookings-day-divider-past' : '');
    var dt = new Date(dateStr + 'T00:00:00');
    divider.textContent = dt.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    container.appendChild(divider);

    var blocks = mergeAllBookingBlocks(dateStr, dateSlots, today);
    for (var b = 0; b < blocks.length; b++) {
      container.appendChild(buildAllBookingBlock(blocks[b], { showDate: false, isPast: isPast }));
    }
  }
  /* Only update global badges/jumps when rendering the full all-bookings view */
  if (!opts.dateFilter) {
    _updateAllBookingsBadges();
    setTimeout(updateJumpBtns, 50);
  }
}

/**
 * Teacher wrapper — merges by studentId, resolves student user object.
 */
function mergeAllBookingBlocks(dateStr, bookedSlots, today) {
  /* Deduplicate: if a slot has students[], it already represents all students.
     Filter out any legacy duplicate slots at the same time (extra-student slots
     from old model) by keeping only unique slotIds. */
  var seen = {};
  var deduped = bookedSlots.filter(function(s) {
    if (seen[s.slotId]) return false;
    seen[s.slotId] = true;
    return true;
  });
  /* Add a synthetic groupKey to each slot: sorted student UIDs joined.
     This makes mergeBookingBlocks treat consecutive slots with the same
     student set as one block, regardless of individual slotIds. */
  var keyed = deduped.map(function(s) {
    var sids = (s.students && s.students.length) ? s.students.slice() : (s.studentId ? [s.studentId] : []);
    sids.sort();
    var clone = {};
    for (var k in s) clone[k] = s[k];
    clone._groupKey = sids.join('|') || s.slotId;
    return clone;
  });
  return mergeBookingBlocks(dateStr, keyed, today, {
    groupField:   '_groupKey',
    resolveParty: function(s) {
      var studentIds = (s.students && s.students.length) ? s.students : (s.studentId ? [s.studentId] : []);
      var students   = studentIds.map(function(uid) { return AppService.getUserSync(uid); }).filter(Boolean);
      return {
        student:    students[0] || null,
        students:   students,
        studentIds: studentIds
      };
    },
    viewerUid:    currentUser ? currentUser.uid : null
  });
}

/* Teacher wrapper for shared buildBookingBlock */
function buildAllBookingBlock(block, options) {
  var isPast       = !!(options && options.isPast);
  var simpleDetail = !!(options && options.simpleDetail);
  return buildBookingBlock(block, {
    showDate:       !options || options.showDate !== false,
    isPast:         isPast,
    expandedBlocks: expandedAllBlocks,
    blockKeyFn:     function(b) {
      var slotKey = b.bookedSlots && b.bookedSlots[0] ? b.bookedSlots[0].slotId : 'x';
      return b.dateStr + '-' + b.start + '-' + slotKey;
    },
    nameFn:         function(b) {
      if (b.students && b.students.length > 1) {
        return b.students.map(function(s) {
          return AppService.getDisplayNameSync(s.uid);
        }).join(', ');
      }
      return AppService.getDisplayNameSync(b.student ? b.student.uid : '?');
    },
    priceFn:        function(b) {
      /* Use locked price from first booked slot if available */
      var lockedPrice = b.bookedSlots && b.bookedSlots[0] && b.bookedSlots[0].price;
      var price = parseFloat(lockedPrice) || 0;
      if (!price || isNaN(price)) return '';
      return _fmtForUser(price * b.bookedSlots.length, currentUser ? currentUser.uid : null);
    },
    onConfirmBlock: null, /* hidden — confirmation is student-only */
    onEditBlock:    function(b) { openMoveBlockDialog(b); },
    onReleaseBlock: function(b) { _openReleaseDialog(b); },
    populateDetail: function(det, b) {
      if (simpleDetail) populateSimpleBlockDetail(det, b);
      else populateAllBookingDetail(det, b, null, { onDismissAll: discardBookingChanges });
    }
  });
}

/* Teacher wrapper for shared populateBookingDetail */
function populateAllBookingDetail(detail, block, onAction, extraOpts) {
  var stuId = block.student ? block.student.uid : null;
  populateBookingDetail(detail, block, {
    pendingMap:     pendingBookings,
    hideRecurring:  true,
    onDismissAll:   extraOpts && extraOpts.onDismissAll ? extraOpts.onDismissAll : null,
    getSlots:       function(b) { return AppService.getSlotsByTeacherDateSync(currentUser.uid, b.dateStr); },
    showFreeSlots:  true,
    stuId:          stuId,
    onConfirmSlot:  null, /* hidden — confirmation is student-only */
    slotPriceFn:    function(slot) { return _fmtForUser(slot.price, currentUser ? currentUser.uid : null); },
    onAddSlot:      function(s, map) {
      var original = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0];
      map[s.slotId] = { action: 'book', originalSlot: original, newStudentId: stuId, extraStudents: [] };
      updateBookingSaveBtn();
      renderStudentList();
      renderAllBookingsList();
      renderDayPanel();
    },
    onRequestSlot:  function(s, map) {
      /* on_request: send booking_request service message, don't book yet */
      if (!stuId) return;
      var original  = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0] || s;
      var dateObj   = new Date((original.date || s.date || '') + 'T00:00:00');
      var dateLabel = dateObj.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
      var endTime   = AppService.slotEndTime(original.time || s.time || '');
      ChatStore.sendBookingRequest(currentUser.uid, stuId, {
        slotId:    original.slotId || s.slotId,
        date:      original.date   || s.date   || '',
        dateLabel: dateLabel,
        time:      original.time   || s.time   || '',
        endTime:   endTime
      });
      /* EmailService.onBookingCreated fired by AppService.bookSlotWithEscrowSilent on confirmation */
      Toast.success('Buchungsanfrage an ' + AppService.getDisplayNameSync(stuId) + ' gesendet.');
    },
    onAction: function() {
      updateBookingSaveBtn();
      renderStudentList();
      renderAllBookingsList();
      renderDayPanel();
      if (onAction) onAction();
    }
  });
}

/* ── Simple detail — only the block's own booked slots, no day-lookup ── */
function populateSimpleBlockDetail(detail, block) {
  detail.innerHTML = '';
  var slots = block.bookedSlots;
  if (!slots || !slots.length) return;

  for (var i = 0; i < slots.length; i++) {
    var s    = slots[i];
    var orig = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0] || s;
    var isConfirmed = !!orig.confirmedAt;

    var row = document.createElement('div');
    row.className = 'all-booking-slot-row';

    var timeEl = document.createElement('span');
    timeEl.className = 'all-booking-slot-time';
    timeEl.textContent = orig.time + ' \u2013 ' + AppService.slotEndTime(orig.time);

    var statusEl = document.createElement('span');
    statusEl.className = 'all-booking-slot-status';
    statusEl.textContent = isConfirmed ? '\u2713 Bestätigt' : 'Gebucht';

    row.appendChild(timeEl);
    row.appendChild(statusEl);
    detail.appendChild(row);
  }
}

/* ── Bestätigungs-Dialog (Block-Level) ───────────────── */
/* ── Verfügbarkeit 2 — single-student cancel dialog ───────── */
function _openV2CancelDialog(studentId, slot, onConfirmed) {
  var studentName = AppService.getDisplayNameSync(studentId);
  var dateObj     = new Date((slot.date || '') + 'T00:00:00');
  var dateLabel   = dateObj.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' });
  var endTime     = AppService.slotEndTime(slot.time || '');
  var price       = parseFloat(slot.price) || 0;
  var fmt         = function(a) { return _fmtForUser(a, currentUser ? currentUser.uid : null); };

  AppService.calcCancellationPolicy(slot.slotId, 'teacher', function(err, policy) {
    var refund  = (!err && policy) ? (parseFloat(policy.refundAmount)  || 0) : price;
    var forfeit = (!err && policy) ? (parseFloat(policy.forfeitAmount) || 0) : 0;

    var policyHTML =
      '<div class="policy-card">' +
        '<div class="policy-row"><span class="policy-label">Preis</span><span class="policy-value">' + fmt(price) + '</span></div>' +
        (refund  > 0 ? '<div class="policy-row"><span class="policy-label">Rückerstattung</span><span class="policy-refund">' + fmt(refund)  + '</span></div>' : '') +
        (forfeit > 0 ? '<div class="policy-row"><span class="policy-label">Einbehalten</span><span class="policy-value">'  + fmt(forfeit) + '</span></div>' : '') +
      '</div>';

    var warnHTML = forfeit > 0
      ? '<div class="policy-warn">⚠️ Kurzfristige Stornierung — Teileinbehalt gemäß Bedingungen.</div>'
      : '<div class="policy-ok">✓ Rechtzeitige Stornierung — volle Rückerstattung.</div>';

    var bodyHTML =
      '<div class="dlg-student-row">' +
        buildAvatarHTML(studentId, { size: 'md', role: 'student' }) +
        '<div style="margin-left:10px"><div class="dlg-name">' + _esc(studentName) + '</div>' +
        '<div class="dlg-slot">' + _esc(dateLabel) + ' · ' + _esc(_tTeacherTime(slot.time || '', slot.date || '')) + '–' + _esc(_tTeacherEndTime(slot.time || '', slot.date || '')) + '</div></div>' +      '</div>' +
      policyHTML +
      warnHTML;

    var result = Modal.show({
      title: 'Buchung stornieren',
      bodyHTML: bodyHTML,
      footerHTML:
        '<button class="btn btn-ghost" id="v2-cancel-abort">Abbrechen</button>' +
        '<button class="btn btn-danger" id="v2-cancel-confirm">Stornieren &amp; Rückerstatten</button>'
    });

    document.getElementById('v2-cancel-abort').addEventListener('click', result.close);
    document.getElementById('v2-cancel-confirm').addEventListener('click', function() {
      result.close();
      AppService.removeStudentFromSlot(slot.slotId, studentId, 'teacher', function(e) {
        if (e) { Toast.error(e.message || e); return; }
        Toast.success(studentName + ' — Buchung storniert.');
        _tdvRenderSlots();
        renderDayPanel();
        renderCalendar();
        renderStudentList();
        renderAllBookingsList();
        if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(currentUser.uid);
        /* Fix 3 — callback after confirmed cancellation (e.g. to set timeout) */
        if (typeof onConfirmed === 'function') onConfirmed();
      });
    });
  });
}


function _openConfirmDialog(block) {
  var stuUid      = block.student ? block.student.uid : null;
  var stuName     = AppService.getDisplayNameSync(stuUid || '?');
  var teachName   = AppService.getDisplayNameSync(currentUser.uid);
  var bookedSlots = block.bookedSlots || [];
  var slotCount   = bookedSlots.length;
  var firstSlot   = slotCount ? AppService.getAllSlotsSync().filter(function(s){ return s.slotId === bookedSlots[0].slotId; })[0] : null;
  var dateLabel   = firstSlot ? (function() {
    var d = new Date(firstSlot.date + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  })() : '';

  function _loadAllEscrows(slots, cb) {
    if (!slots.length) { cb([]); return; }
    var results = []; var pending = slots.length;
    slots.forEach(function(s) {
      AppService.getEscrowBySlot(s.slotId, function(err, esc) {
        if (esc) results.push(esc);
        if (--pending === 0) cb(results);
      });
    });
  }

  function _show(escrows) {
    var totalFull = 0; var totalDeposit = 0;
    var depositStatus = null; var paymentMode = 'instant';
    var requiresDep = false; var depositType = 'fixed'; var depositPct = null;
    escrows.forEach(function(e) {
      totalFull    += parseFloat(e.fullAmount)    || 0;
      totalDeposit += parseFloat(e.depositAmount) || 0;
      depositStatus = e.depositStatus || depositStatus;
      paymentMode   = e.paymentMode   || paymentMode;
      requiresDep   = requiresDep || (e.requiresDeposit !== false);
      depositType   = e.depositType   || depositType;
      if (e.depositPercent != null) depositPct = e.depositPercent;
    });
    totalFull    = Math.round(totalFull    * 100) / 100;
    totalDeposit = Math.round(totalDeposit * 100) / 100;
    var syntheticEscrow = escrows.length ? {
      fullAmount: totalFull, depositAmount: totalDeposit,
      depositStatus: depositStatus, paymentMode: paymentMode,
      requiresDeposit: requiresDep, depositType: depositType, depositPercent: depositPct
    } : null;
    var slotNote = slotCount > 1 ? slotCount + ' Slots' : '1 Slot';
    var bodyHTML = _buildConfirmDetailBody({
      teacherName: teachName, studentName: stuName,
      dateLabel: dateLabel + ' &bull; ' + slotNote,
      timeStart: block.start, timeEnd: block.end,
      escrow: syntheticEscrow, walletBalance: null, actorRole: 'teacher', actorUid: currentUser ? currentUser.uid : null
    });
    var result = Modal.show({
      title: 'Stunde bestätigen', bodyHTML: bodyHTML,
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button><button class="btn btn-primary" id="modal-confirm">Jetzt bestätigen</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      result.close();
      AppService.confirmBlock(block.bookedSlots, function(e) {
        if (e) { Toast.error(e.message || e); return; }
        _updateAllBookingsBadges(); renderAllBookingsList(); renderDayPanel();
        if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(currentUser.uid);
      });
    });
  }

  _loadAllEscrows(bookedSlots, _show);
}

/* ── Bestätigungs-Dialog (Slot-Level) ────────────────── */
function _openConfirmDialogSingle(slotId) {
  var slot = AppService.getAllSlotsSync().filter(function(s) { return s.slotId === slotId; })[0];
  if (!slot) return;
  var stuName   = AppService.getDisplayNameSync(slot.studentId || '?');
  var teachName = AppService.getDisplayNameSync(currentUser.uid);
  var endTime   = AppService.slotEndTime(slot.time);
  var dateObj   = new Date(slot.date + 'T00:00:00');
  var dateLabel = dateObj.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

  AppService.getEscrowBySlot(slotId, function(err, escrow) {
    var bodyHTML = _buildConfirmDetailBody({
      teacherName: teachName, studentName: stuName,
      dateLabel: dateLabel, timeStart: slot.time, timeEnd: endTime,
      escrow: escrow || null, walletBalance: null, actorRole: 'teacher', actorUid: currentUser ? currentUser.uid : null
    });
    var result = Modal.show({
      title: 'Slot bestätigen', bodyHTML: bodyHTML,
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button><button class="btn btn-primary" id="modal-confirm">Jetzt bestätigen</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      AppService.confirmSlot(slotId, function(e){if(e)Toast.error(e.message||e);});
      _updateAllBookingsBadges(); renderAllBookingsList(); renderDayPanel();
      result.close();
    });
  });
}

/* ── Freigabe-Dialog ─────────────────────────────────── */
function _openReleaseDialog(block) {
  var stuName = AppService.getDisplayNameSync(block.student ? block.student.uid : '?');
  var bodyHTML =
    '<div class="move-dialog">' +
      '<p class="move-dialog-info">Möchtest du die Zeitslots der Stunde von <strong>' + stuName + '</strong> (' + block.start + ' \u2013 ' + block.end + ') freigeben?</p>' +
      '<p class="move-dialog-info">Die Slots werden wieder für andere Schüler verfügbar gemacht. Ein Hinweis bleibt im Kalender sichtbar.</p>' +
    '</div>';
  var result = Modal.show({
    title: 'Slot freigeben',
    bodyHTML: bodyHTML,
    footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button><button class="btn btn-primary" id="modal-confirm">Freigeben</button>'
  });
  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    for (var ri = 0; ri < block.bookedSlots.length; ri++) {
      AppService.releaseSlot(block.bookedSlots[ri].slotId, function(e){if(e)Toast.error(e.message||e);});
    }
    renderAllBookingsList();
    renderCalendarMonth();
    result.close();
  });
}

/* ── Move Dialog ─────────────────────────────────────── */
/* ── Move Block Dialog (alle Slots auf einmal) ───────── */
function openMoveBlockDialog(block) {
  openMoveBlockDialogShared({
    block:           block,
    teacherId:       currentUser.uid,
    actorRole:       'teacher',
    pendingMap:      pendingBookings,
    stuId:           block.student ? block.student.uid : null,
    onConfirmBlock:  function() {
      _updateAllBookingsBadges();
      renderAllBookingsList();
      renderDayPanel();
    },
    onCancelBlock:   function() {
      updateBookingSaveBtn();
      _scheduleRender({ studentList: true, calendar: true, dayPanel: true, allBookings: true });
      /* WalletPanel.refresh and navbar update handled by _showCancelBlockPolicyDialog */
    },
    onConfirm:  function(movedPending, dialogOpts) {
      /* Capture move opts by studentId for writeMoveRecord */
      var stuIdForMove = block.student ? block.student.uid : null;
      if (stuIdForMove && dialogOpts && dialogOpts._lastMoveOpts) {
        pendingMoveOpts[stuIdForMove] = dialogOpts._lastMoveOpts;
      }
      /* Immediately save — no manual Save step needed */
      saveBookingChanges();
    },
    onCalJump: function(dateStr, result) {
      if (!dateStr) return;
      var target = new Date(dateStr + 'T00:00:00');
      selectedDate = target;
      viewYear  = target.getFullYear();
      viewMonth = target.getMonth();
      activeDayTab = 'bookings';
      switchTeacherView('schedule');
      _scheduleRender({ calendar: true, dayPanel: true });
      result.close();
      setTimeout(function() {
        var panel = document.getElementById('section-daypanel');
        if (panel) {
          var offset = getStickyOffset();
          var top = panel.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      }, 80);
    }
  });
}

function getWeekDates() {
  var dates = [];
  for (var d = 0; d < 7; d++) {
    var wd = new Date(gridWeekStart);
    wd.setDate(wd.getDate() + d);
    dates.push(wd);
  }
  return dates;
}

function weekRangeLabel(dates) {
  return dates[0].toLocaleDateString('en-GB', { day:'numeric', month:'short' })
    + ' – '
    + dates[6].toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function updateStats() {
  var allSlots = AppService.getSlotsByTeacherSync(currentUser.uid);
  var today    = fmtDate(new Date());

  /* stat-booked: all-time total — same guard as badges (requires studentId) */
  var booked = allSlots.filter(function(s) { return s.status === 'booked' && s.studentId; });
  var counts = _calcBlockCounts(booked, today);
  var statBookedEl = document.getElementById('stat-booked');
  if (statBookedEl) statBookedEl.textContent = counts.all;

  var availEl = document.getElementById('stat-available');
  if (availEl) availEl.textContent = allSlots.filter(function(s) { return s.status === 'available'; }).length;

  /* keep confirm-filter badges in sync from the same trigger */
  _updateAllBookingsBadges();
}

/* ── Section jump buttons ─────────────────────────────── */
function getSectionJumpTargets() {
  if (activeTeacherView === 'all-bookings') {
    var dividers = document.querySelectorAll('#view-all-bookings .all-bookings-day-divider');
    var pageTop  = document.querySelector('.page-header') || document.getElementById('view-all-bookings');
    if (dividers.length) return [pageTop].concat(Array.prototype.slice.call(dividers)).filter(Boolean);
    return [pageTop].filter(Boolean);
  }
  return [
    document.querySelector('.page-header'),
    document.getElementById('section-calendar'),
    document.getElementById('section-daypanel')
  ].filter(Boolean);
}

window.addEventListener('scroll', updateJumpBtns);
window.addEventListener('scroll', checkDayNavSticky);

window.addEventListener('resize', function() {
  window._dayNavStickyActive = !window._dayNavStickyActive;
  checkDayNavSticky();
});


function navDay(delta) { _navDayShared(delta, renderDayPanel); }
function navMonth(delta) { _navMonthShared(delta, renderDayPanel); }

function checkDayNavSticky() { checkDayNavStickyShared('section-daypanel'); }

/* ── Cross-tab sync via AppService.onChange ── */
AppService.onChange(function(e) {
  if (e.key === 'app_slots' || e.key === 'app_selections' || e.key === 'app_users') {
    updateStats();
    _scheduleRender({ studentList: true, calendar: true, dayPanel: true, allBookings: true });
  }
});

function updateJumpBtns() { _updateJumpBtnsShared(activeTeacherView === 'all-bookings' && getSectionJumpTargets().length > 1); }

function prevMonth() { _invalidateMaterialiseCache(); _prevMonthShared(); }
function nextMonth() { _invalidateMaterialiseCache(); _nextMonthShared(); }

/* ══════════════════════════════════════════════════════════
   TEACHER DAY VIEW
   Variables, render, open/close, slot actions
══════════════════════════════════════════════════════════ */

var _tdvDate    = null;   /* currently displayed Date object */
var _tdvOpen    = false;

var _TDV_WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
var _TDV_MONTHS   = ['Januar','Februar','März','April','Mai','Juni',
                     'Juli','August','September','Oktober','November','Dezember'];

/* ── Open / Close ───────────────────────────────────────── */
function openTeacherDayView(date) {
  _tdvDate = (date instanceof Date) ? date : new Date(date + 'T00:00:00');
  _tdvOpen = true;
  var overlay = document.getElementById('teacher-day-view-overlay');
  overlay.classList.add('is-open');
  _tdvRenderTopbar();
  /* Materialise recurring rules once when opening the day view */
  var _dow = _tdvDate.getDay();
  var _mon = new Date(_tdvDate);
  _mon.setDate(_tdvDate.getDate() - ((_dow === 0) ? 6 : _dow - 1));
  var _wdates = [];
  for (var _wi = 0; _wi < 7; _wi++) {
    var _wd = new Date(_mon); _wd.setDate(_mon.getDate() + _wi); _wdates.push(_wd);
  }
  AppService.materialiseWeek(currentUser.uid, _wdates, function(e) {
    if (e) Toast.error(e.message || e);
    _tdvRenderSlots();
  });
}

function closeTeacherDayView() {
  _tdvOpen = false;
  document.getElementById('teacher-day-view-overlay').classList.remove('is-open');
}

/* ── Topbar label ───────────────────────────────────────── */
function _tdvRenderTopbar() {
  if (!_tdvDate) return;
  document.getElementById('tdv-weekday').textContent = _TDV_WEEKDAYS[_tdvDate.getDay()];
  document.getElementById('tdv-date').textContent    =
    _tdvDate.getDate() + '. ' + _TDV_MONTHS[_tdvDate.getMonth()] + ' ' + _tdvDate.getFullYear();
}

/* ── Slot list ──────────────────────────────────────────── */
function _tdvRenderSlots() {
  var container = document.getElementById('tdv-slot-list');
  container.innerHTML = '';

  if (!_tdvDate || !currentUser) return;

  var dateStr = fmtDate(_tdvDate);
  var slots   = AppService.getSlotsByTeacherDateSync(currentUser.uid, dateStr);

  /* Build a lookup: time → slot, applying pending availability overrides */
  var slotMap = {};
  for (var si = 0; si < slots.length; si++) {
    var _effSlot = _getEffectiveAvailSlot(slots[si]);
    slotMap[_effSlot.time] = _effSlot;
  }
  /* Inject pending creates as virtual slots */
  for (var _cpk in _pendingCreateMap) {
    var _cp = _pendingCreateMap[_cpk];
    if (_cp.date === dateStr && !slotMap[_cp.time]) {
      slotMap[_cp.time] = { slotId: '__pending__' + _cpk, teacherId: currentUser.uid,
        date: _cp.date, time: _cp.time, status: _cp.newStatus, baseStatus: _cp.newBase,
        _pendingAvail: 'create' };
    }
  }

  var times = _tdvBuildAllDayTimes(); /* 00:00 – 23:30, all 48 slots */
  var todayStr = fmtDate(new Date());
  var isPastDay = dateStr < todayStr;

  /* Section boundaries — full 24h */
  var sections = [
    { label: 'Nacht',      from: '00:00', to: '05:30' },
    { label: 'Morgen',     from: '06:00', to: '09:30' },
    { label: 'Vormittag',  from: '10:00', to: '11:30' },
    { label: 'Mittag',     from: '12:00', to: '13:30' },
    { label: 'Nachmittag', from: '14:00', to: '17:30' },
    { label: 'Abend',      from: '18:00', to: '21:30' },
    { label: 'Nacht',      from: '22:00', to: '23:30' }
  ];
  var sectionIdx = 0;
  var sectionRendered = {};

  var frag = document.createDocumentFragment();

  for (var ti = 0; ti < times.length; ti++) {
    var time = times[ti];

    /* Section label */
    for (var sci = sectionIdx; sci < sections.length; sci++) {
      if (time >= sections[sci].from && time <= sections[sci].to && !sectionRendered[sci]) {
        var lbl = document.createElement('div');
        lbl.className = 'dv-section-label';
        lbl.textContent = sections[sci].label;
        lbl.setAttribute('aria-hidden', 'true');
        frag.appendChild(lbl);
        sectionRendered[sci] = true;
        sectionIdx = sci;
        break;
      }
    }

    var slot = slotMap[time] || null;
    frag.appendChild(_tdvBuildRow(slot, time, dateStr, isPastDay));
  }

  /* If no slots exist at all, show empty state */
  if (!slots.length && !isPastDay) {
    var emptyState = document.createElement('div');
    emptyState.className = 'dv-empty-state';
    var emptyText = document.createElement('p');
    emptyText.className = 'dv-empty-state-text';
    emptyText.textContent = _tcT('emptyDaySlotsLong');
    emptyState.appendChild(emptyText);
    var wvBtn = document.createElement('button');
    wvBtn.className = 'btn btn-primary btn-sm';
    wvBtn.textContent = _tcT('btnOpenWeekView');
    wvBtn.addEventListener('click', function() { closeTeacherDayView(); openSlotGrid(); });
    emptyState.appendChild(wvBtn);
    container.appendChild(emptyState);
    return;
  }

  container.appendChild(frag);
}

/* ── Build a single slot row ────────────────────────────── */
/* ══════════════════════════════════════════════════════════
   _buildSlotActions — builds the FIXED 4-button action column
   for any slot status. Always: ⚙ · 👁/👁‍🗨 · ⏱ · +
   Layout never changes between status transitions.
══════════════════════════════════════════════════════════ */
function _buildSlotActions(slot, status, time, dateStr, isPastDay) {
  var action = document.createElement('div');
  action.className = 'dv-slot-action';
  if (isPastDay) return action;

  var slotExists = slot && slot.slotId && slot.slotId.indexOf('__pending__') !== 0;
  var isPending  = slot && !!slot._pendingAvail;

  /* Wrap _stageSlotChange to show spinner on button while row is being swapped.
     No artificial timer — spinner appears on tap and disappears when row swaps. */
  function _stage(btn, spinVariant, opts) {
    /* Find the row this button belongs to */
    var row = btn ? btn.closest('[data-utc-time]') : null;

    /* 1. Immediately dim the row and show spinner overlay */
    if (row) {
      row.classList.add('is-pending-write');
      /* Inject spinner into the action column */
      var _actionCol = row.querySelector('.dv-slot-action');
      if (_actionCol) {
        _actionCol._savedHTML = _actionCol.innerHTML;
        _actionCol.innerHTML  = '<div style="display:flex;align-items:center;justify-content:flex-end;width:100%;height:100%;padding-right:8px;"><span class="spinner spinner--md spinner--' + (spinVariant === 'light' ? 'light' : spinVariant === 'amber' ? 'amber' : 'dark') + '" aria-hidden="true"></span></div>';
      }
    }

    /* 2. Let browser paint the overlay, then do the staging */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        /* Row will be replaced by _stageSlotChange → _updateSlotRow */
        _stageSlotChange(opts, null, spinVariant, null);
      });
    });
  }

  /* ── ⚙ Gear — Special Settings ── */
  if (slotExists) {
    var gearBtn = _tdvMakeVisBtn(slot);
    gearBtn.classList.add(_slotHasVisConfig(slot) ? 's-btn--l' : 's-btn--g');
    (function(s) {
      gearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _openSlotVisibilityConfig(s, null);
      });
    })(slot);
    action.appendChild(gearBtn);
  } else {
    /* No real slot yet — gear creates disabled slot then opens config */
    var gearEmpty2 = _tdvMakeVisBtn(null);
    gearEmpty2.classList.add('s-btn--g');
    (function(t, ds) {
      gearEmpty2.addEventListener('click', function(e) {
        e.stopPropagation();
        AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t,
          _utc: true, status: 'disabled', baseStatus: 'disabled' }, function(err, newId) {
          if (err) { Toast.error(err.message || err); return; }
          var updated = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
          var newSlot = updated.filter(function(s) { return s.slotId === newId; })[0];
          if (newSlot) _openSlotVisibilityConfig(newSlot, null);
          renderDayPanel(); _tdvRenderSlots();
        });
      });
    })(time, dateStr);
    action.appendChild(gearEmpty2);
  }

  /* ── 👁 Eye toggle — available ↔ disabled ── */
  if (status === 'available' || status === 'recurring') {
    var eyeOn = _makeSlotBtn('eye', slotExists ? 'd' : 'g', 'Für Schüler ausblenden');
    if (slotExists) {
      (function(s) {
        eyeOn.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(eyeOn, 'light', { action:'set-status', slot:s, newStatus:'disabled', newBase:'disabled' });
        });
      })(slot);
    }
    action.appendChild(eyeOn);
  } else {
    /* disabled / empty / timeout / booked — show eye-slash (make available) */
    var eyeOff2 = _makeSlotBtn('eyeOff', 'g', 'Verfügbar schalten');
    if (slotExists && status !== 'booked') {
      (function(s) {
        eyeOff2.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(eyeOff2, 'dark', { action:'set-status', slot:s, newStatus:'available', newBase:'available' });
        });
      })(slot);
    } else if (!slotExists) {
      (function(t, ds) {
        eyeOff2.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(eyeOff2, 'dark', { action:'create', newStatus:'available', newBase:'available', date:ds, time:t });
        });
      })(time, dateStr);
    }
    action.appendChild(eyeOff2);
  }

  /* ── ⏱ Timeout toggle ── */
  if (status === 'timeout') {
    /* Undo timeout */
    var undoBtn = _makeSlotBtn('undoTo', 'amber', 'Timeout aufheben');
    if (slotExists) {
      (function(s) {
        var wasA = (s.baseStatus === 'available' || s.baseStatus === 'recurring');
        undoBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (wasA) {
            _stage(undoBtn, 'amber', { action:'set-status', slot:s, newStatus:'available', newBase:'available' });
          } else {
            _stage(undoBtn, 'amber', { action:'delete', slot:s, newStatus:'empty', newBase:'empty' });
          }
        });
      })(slot);
    }
    action.appendChild(undoBtn);
  } else {
    /* Set timeout */
    var toBtn3 = _makeSlotBtn('timeout', 'g', 'Timeout setzen');
    if (slotExists && status !== 'booked') {
      (function(s) {
        toBtn3.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(toBtn3, 'dark', { action:'set-status', slot:s, newStatus:'timeout', newBase:s.baseStatus||'available' });
        });
      })(slot);
    } else if (!slotExists) {
      (function(t, ds) {
        toBtn3.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(toBtn3, 'dark', { action:'create', newStatus:'timeout', newBase:'timeout', date:ds, time:t });
        });
      })(time, dateStr);
    }
    action.appendChild(toBtn3);
  }

  /* ── + Book ── */
  var addBtnFinal = _makeSlotBtn('plus',
    (status === 'available' || status === 'recurring') ? 'l' :
    (status === 'booked') ? 'd' : 'l',
    'Schüler buchen');
  (function(s, t, ds) {
    addBtnFinal.addEventListener('click', function(e) {
      e.stopPropagation();
      if (s && s.slotId && s.slotId.indexOf('__pending__') !== 0) {
        var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
        buildBookingForm(s, ds, allSlots, true);
      } else {
        AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t,
          _utc: true, status: 'disabled', baseStatus: 'disabled' }, function(err, newId) {
          if (err) { Toast.error(err.message || err); return; }
          var updated = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
          var newSlot = updated.filter(function(x) { return x.slotId === newId; })[0];
          if (newSlot) buildBookingForm(newSlot, ds, updated, true);
        });
      }
    });
  })(slot, time, dateStr);
  action.appendChild(addBtnFinal);

  return action;
}

function _tdvBuildRow(slot, time, dateStr, isPastDay) {
  var _localTime = _tTeacherTime(time, dateStr);
  var endTime    = AppService.slotEndTime(_localTime);
  var status  = slot ? (slot.status || slot.baseStatus) : 'empty';

  /* Row classes */
  var rowClass = 'dv-slot-row ';
  if (isPastDay)              rowClass += 'dv-s-past';
  else if (status === 'booked')    rowClass += 'dv-s-booked';
  else if (status === 'available' || status === 'recurring') rowClass += 'dv-s-' + status;
  else if (status === 'timeout') {
    var _base2 = slot ? (slot.baseStatus || 'timeout') : 'timeout';
    var _wasAvail2 = (_base2 === 'available' || _base2 === 'recurring');
    rowClass += _wasAvail2 ? 'dv-s-timeout-avail' : 'dv-s-timeout';
  }
  else if (status === 'disabled')  rowClass += 'dv-s-empty'; /* disabled = visually empty */
  else                             rowClass += 'dv-s-empty';

  /* Pending availability change → amber (reuse existing dv-s-timeout style) */
  if (slot && slot._pendingAvail) rowClass += ' dv-s-timeout';
  var row = document.createElement('div');
  row.className = rowClass.trim();
  row.setAttribute('role', 'listitem');
  row.setAttribute('data-utc-time', time);

  /* Time column */
  var timeCol = document.createElement('div');
  timeCol.className = 'dv-slot-time';
  timeCol.setAttribute('aria-label', time + ' bis ' + endTime);
  var tStart = document.createElement('span');
  tStart.className = 'dv-time-start';
  tStart.textContent = _localTime;
  var tEnd = document.createElement('span');
  tEnd.className = 'dv-time-end';
  tEnd.textContent = '\u2013' + endTime;
  timeCol.appendChild(tStart);
  timeCol.appendChild(tEnd);

  /* Separator */
  var sep = document.createElement('div');
  sep.className = 'dv-slot-sep';
  sep.setAttribute('aria-hidden', 'true');

  /* Info column */
  var info = document.createElement('div');
  info.className = 'dv-slot-info';

  /* Action column — fixed 4-button set via shared helper */
  var action = _buildSlotActions(slot, status, time, dateStr, isPastDay);

  /* ── Fill info only by status ── */
  if (status === 'booked' && slot) {
    var sName = slot.studentId ? AppService.getDisplayNameSync(slot.studentId) : 'Unbekannt';
    var nameEl = document.createElement('span');
    nameEl.className = 'dv-student-name';
    nameEl.textContent = sName;
    info.appendChild(nameEl);

    if (slot.studentId) {
      var student = AppService.getUserSync(slot.studentId);
      if (student && student.email) {
        var metaEl = document.createElement('span');
        metaEl.className = 'dv-student-meta';
        metaEl.textContent = student.email;
        info.appendChild(metaEl);
      }
    }
    if (slot.confirmedAt) {
      var confBadge = document.createElement('span');
      confBadge.className = 'dv-confirmed-badge';
      confBadge.textContent = '\u2713 Bestätigt';
      info.appendChild(confBadge);
    }

    if (!isPastDay) {
      var detBtn = _tdvMakeActionBtn('dv-btn-detail', 'Details', _svgArrow());
      (function(s) {
        detBtn.addEventListener('click', function() { _tdvOpenBookingDetail(s); });
      })(slot);
    }

  } else if (status === 'available' || status === 'recurring') {
    /* No status pill — row color (navy=available, amber=timeout) communicates state */
    if (status === 'recurring') info.appendChild(_tdvMakePill('dv-pill-recurring', 'Wiederkehrend'));
    var visBadge0 = _tdvBuildVisBadge(slot);
    if (visBadge0) info.appendChild(visBadge0);
    if (!isPastDay && slot) {
      var visBtn0 = _tdvMakeVisBtn(slot);
      (function(s) {
        visBtn0.addEventListener('click', function(e) { e.stopPropagation(); _openSlotVisibilityConfig(s, null); });
      })(slot);
      var deakBtn = _tdvMakeInlineBtn('Deaktivieren');
      (function(s) {
        deakBtn.addEventListener('click', function() {
          var d = new Date(s.date + 'T00:00:00');
          var dow = d.getDay(); dow = (dow === 0) ? 6 : dow - 1;
          /* Delete slot entirely — back to "Kein Slot angelegt" */
          AppService.deleteSlot(s.slotId, function(e) {
            if (e) { Toast.error(e.message || e); }
            _tdvRenderSlots(); _scheduleRender({ calendar: true, dayPanel: true, studentList: true, allBookings: true });
          });
          AppService.deleteRecurringByDayTime(currentUser.uid, dow, s.time, function(e) { if (e) Toast.error(e.message || e); });
        });
      })(slot);
      var toBtn2 = _tdvMakeInlineBtn('Timeout');
      (function(s) {
        toBtn2.addEventListener('click', function() {
          _stage(toBtn2, 'dark', { action:'set-status', slot:s, newStatus:'timeout', newBase:s.baseStatus||'available' });
        });
      })(slot);
    }

  } else if (status === 'timeout') {
    var swIcon = document.createElement('span');
    swIcon.className = 'dv-timeout-icon';
    swIcon.setAttribute('title', 'Timeout aktiv');
    swIcon.setAttribute('aria-hidden', 'true');
    swIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14.5 15.5"/><path d="M9 3h6M12 3v2"/></svg>';
    info.appendChild(swIcon);

    if (!isPastDay && slot) {
      var unblockBtn = _tdvMakeInlineBtn('Aufheben');
      (function(s, wasA) {
        unblockBtn.addEventListener('click', function() {
          if (wasA) {
            _stage(unblockBtn, 'amber', { action:'set-status', slot:s, newStatus:'available', newBase:'available' });
          } else {
            _stage(unblockBtn, 'amber', { action:'delete', slot:s, newStatus:'empty', newBase:'empty' });
          }
        });
      })(slot, wasAvail);
    }

  } else if (status === 'disabled') {
    /* disabled = slot exists but invisible to students.
       Treat visually same as empty — no special label needed. */
    if (!isPastDay && slot) {
      var eyeOffBtnR0 = _makeSlotBtn('eyeOff', 'g', 'Verfügbar schalten');
      (function(s) {
        eyeOffBtnR0.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(eyeOffBtnR0, 'dark', { action:'set-status', slot:s, newStatus:'available', newBase:'available' });
        });
      })(slot);
      var addBtnR0 = _makeSlotBtn('plus', 'l', 'Schüler direkt buchen');
      (function(s, ds) {
        addBtnR0.addEventListener('click', function(e) {
          e.stopPropagation();
          var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
          buildBookingForm(s, ds, allSlots, true);
        });
      })(slot, dateStr);
    }

  } else {
    /* empty — no slot yet */
    var hint = document.createElement('span');
    hint.className = 'dv-empty-hint';
    hint.textContent = _tcT('emptySlotHint');
    info.appendChild(hint);
    if (!isPastDay) {
      var verfBtn = _tdvMakeInlineBtn('Hinzufügen');
      (function(t, ds) {
        verfBtn.addEventListener('click', function() {
          _stage(verfBtn, 'dark', { action:'create', newStatus:'available', newBase:'available', date:ds, time:t });
        });
      })(time, dateStr);
      var toBtn = _tdvMakeInlineBtn('Timeout');
      (function(t, ds) {
        toBtn.addEventListener('click', function() {
          _stage(toBtn, 'dark', { action:'create', newStatus:'timeout', newBase:'timeout', date:ds, time:t });
        });
      })(time, dateStr);
    }
  }

  if (isPastDay && status !== 'booked') {
    info.appendChild(_tdvMakePill('dv-pill-past', 'Vergangen'));
  }

  row.appendChild(timeCol);
  row.appendChild(sep);
  row.appendChild(info);
  row.appendChild(action);
  return row;
}

/* ── Booking detail modal ───────────────────────────────── */

/* ── Verfügbarkeit 2 row builder — same as V1 but booked = colored bg + expandable ── */

/* ── Verfügbarkeit 1 — pure slot management, expandable detail panel ── */
function _tdvBuildRowV1(slot, time, dateStr, isPastDay) {
  var _localTime = _tTeacherTime(time, dateStr);
  var endTime    = AppService.slotEndTime(_localTime);
  var status  = slot ? (slot.status || slot.baseStatus) : 'empty';

  /* Row classes */
  var rowClass = 'dv-slot-row ';
  if (isPastDay)              rowClass += 'dv-s-past';
  else if (status === 'booked')    rowClass += 'dv-s-booked'; /* Fix 2: distinct class for booked */
  else if (status === 'available' || status === 'recurring') rowClass += 'dv-s-' + status;
  else if (status === 'timeout') {
    var _base2 = slot ? (slot.baseStatus || 'timeout') : 'timeout';
    var _wasAvail2 = (_base2 === 'available' || _base2 === 'recurring');
    rowClass += _wasAvail2 ? 'dv-s-timeout-avail' : 'dv-s-timeout';
  }
  else if (status === 'disabled')  rowClass += 'dv-s-empty';
  else                             rowClass += 'dv-s-empty';

  /* Pending availability change → amber */
  if (slot && slot._pendingAvail) rowClass += ' dv-s-timeout';
  var row = document.createElement('div');
  row.className = rowClass.trim();
  row.setAttribute('role', 'listitem');
  row.setAttribute('data-utc-time', time);

  /* ── Row top (always visible) ── */
  var rowTop = document.createElement('div');
  rowTop.className = 'dv-v1-row-top';

  /* Time column */
  var timeCol = document.createElement('div');
  timeCol.className = 'dv-slot-time';
  timeCol.setAttribute('aria-label', time + ' bis ' + endTime);
  var tStart = document.createElement('span');
  tStart.className = 'dv-time-start';
  tStart.textContent = _localTime;
  var tEnd = document.createElement('span');
  tEnd.className = 'dv-time-end';
  tEnd.textContent = '\u2013' + endTime;
  timeCol.appendChild(tStart);
  timeCol.appendChild(tEnd);

  /* Separator */
  var sep = document.createElement('div');
  sep.className = 'dv-slot-sep';
  sep.setAttribute('aria-hidden', 'true');

  /* Info column */
  var info = document.createElement('div');
  info.className = 'dv-slot-info';

  /* Action column — fixed 4-button set */
  var action = _buildSlotActions(slot, status, time, dateStr, isPastDay);

  /* ── Detail panel (hidden until row clicked) ── */
  var detail = document.createElement('div');
  detail.className = 'dv-v1-detail';

  /* ── Helper: build detail content ── */
  var hasDetail = false;

  function _addDetailSection(label) {
    var sec = document.createElement('div');
    sec.className = 'dv-v1-detail-section';
    sec.textContent = label;
    detail.appendChild(sec);
  }

  function _addDetailRow(initials, name, tagClass, tagText) {
    var row2 = document.createElement('div');
    row2.className = 'dv-v1-detail-row';
    var av = document.createElement('div');
    av.className = 'dv-v1-avatar';
    av.textContent = (initials || '?').slice(0, 2).toUpperCase();
    var nm = document.createElement('span');
    nm.className = 'dv-v1-detail-name';
    nm.textContent = name || initials;
    var tg = document.createElement('span');
    tg.className = 'dv-v1-detail-tag ' + tagClass;
    tg.textContent = tagText;
    row2.appendChild(av);
    row2.appendChild(nm);
    row2.appendChild(tg);
    detail.appendChild(row2);
  }

  /* ── Chevron (only on expandable rows) ── */
  var chevron = null;

  /* ── Fill info + action + detail by status ── */
  var isAvailLike = (status === 'available' || status === 'recurring' || status === 'booked');

  if (isAvailLike && slot) {
    /* Recurring pill */
    if (status === 'recurring') {
      info.appendChild(_tdvMakePill('dv-pill-recurring', 'Wiederkehrend'));
    }
    /* Vis badges */
    var visBadge1 = _tdvBuildVisBadge(slot);
    if (visBadge1) info.appendChild(visBadge1);

    /* ── Build chevron first so order is: ► ⚙ [text btns] ── */
    chevron = document.createElement('div');
    chevron.className = 'dv-v1-chevron';
    chevron.innerHTML = '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    chevron.addEventListener('click', function(e) { e.stopPropagation(); row.classList.toggle('is-open'); });

    if (!isPastDay) {
      var visBtn1 = _tdvMakeVisBtn(slot);
      (function(s) {
        visBtn1.addEventListener('click', function(e) { e.stopPropagation(); _openSlotVisibilityConfig(s, null); });
      })(slot);

      if (status !== 'booked') {
        /* Eye-off: hide slot (set disabled) + remove recurring */
        var deakBtn = _tdvMakeInlineBtn('Deaktivieren');
        (function(s) {
          deakBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var d = new Date(s.date + 'T00:00:00');
            var dow = d.getDay(); dow = (dow === 0) ? 6 : dow - 1;
            _pendingRecurringDeletes.push({ uid: currentUser.uid, dow: dow, time: s.time });
            _stage(deakBtn, 'dark', { action:'delete', slot:s, newStatus:'empty', newBase:'empty' });
          });
        })(slot);
        /* Timeout */
        var toBtn2 = _tdvMakeInlineBtn('Timeout');
        (function(s) {
          toBtn2.addEventListener('click', function(e) {
            e.stopPropagation();
            _stage(toBtn2, 'dark', { action:'set-status', slot:s, newStatus:'timeout', newBase:s.baseStatus||'available' });
          });
        })(slot);
        /* + button always visible on available slots */
        var addBtnV1avail = _makeSlotBtn('plus', 'l', 'Schüler buchen');
        (function(s, ds) {
          addBtnV1avail.addEventListener('click', function(e) {
            e.stopPropagation();
            var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
            buildBookingForm(s, ds, allSlots, true);
          });
        })(slot, dateStr);
      } else {
        /* Deaktivieren on booked slot: set disabled, booking preserved */
        var deakBtnV1 = _tdvMakeInlineBtn('Deaktivieren');
        (function(s) {
          deakBtnV1.addEventListener('click', function(e) {
            e.stopPropagation();
            _stage(deakBtnV1, 'light', { action:'set-status', slot:s, newStatus:'disabled', newBase:'disabled' });
          });
        })(slot);

        /* Fix 3 — Timeout auf gebuchtem Slot: Stufe 1 Warning → Stufe 2 _openV2CancelDialog */
        var toBtnV1 = _tdvMakeInlineBtn('Timeout');
        (function(s, ds) {
          toBtnV1.addEventListener('click', function(e) {
            e.stopPropagation();
            var studentId = (s.students && s.students.length) ? s.students[0] : s.studentId;
            var studentName = studentId ? (AppService.getDisplayNameSync(studentId) || studentId) : 'Schüler';
            var _localTs = _tTeacherTime(s.time || '', ds);
            var _endTs   = AppService.slotEndTime(_localTs);
            var dateObj  = new Date(ds + 'T00:00:00');
            var dateLabel = dateObj.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' });

            /* Stufe 1: Warning-Dialog */
            var warningResult = Modal.show({
              title: 'Timeout setzen',
              bodyHTML:
                '<div class="policy-warn" style="margin-bottom:12px">' +
                '⚠ Dieser Slot ist gebucht. Wenn du einen Timeout setzt, wird die Buchung von ' +
                '<strong>' + _esc(studentName) + '</strong> storniert.' +
                '</div>' +
                '<div class="dlg-student-row">' +
                buildAvatarHTML(studentId, { size: 'md', role: 'student' }) +
                '<div style="margin-left:10px"><div class="dlg-name">' + _esc(studentName) + '</div>' +
                '<div class="dlg-slot">' + _esc(dateLabel) + ' \u00b7 ' + _esc(_localTs) + '\u2013' + _esc(_endTs) + '</div></div>' +
                '</div>' +
                '<p style="font-size:12px;color:#6b7685">Im n\u00e4chsten Schritt siehst du die genauen R\u00fcckerstattungsbedingungen.</p>',
              footerHTML:
                '<button class="btn btn-ghost" id="v1-timeout-warn-abort">Abbrechen</button>' +
                '<button class="btn btn-danger" id="v1-timeout-warn-confirm">Weiter \u2192 Stornierung pr\u00fcfen</button>'
            });

            document.getElementById('v1-timeout-warn-abort').addEventListener('click', warningResult.close);
            document.getElementById('v1-timeout-warn-confirm').addEventListener('click', function() {
              warningResult.close();
              /* Stufe 2: bestehender Stornierungsdialog */
              if (studentId) {
                _openV2CancelDialog(studentId, s, function() {
                  /* Nach Bestätigung: Timeout setzen */
                  _stage(toBtnV1, 'light', { action:'set-status', slot:s, newStatus:'timeout', newBase:s.baseStatus||'available' });
                });
              }
            });
          });
        })(slot, dateStr);

        /* Fix 1 — Booking-Form direkt öffnen (kein createSlot davor) */
        var addBtnBooked = _makeSlotBtn('plus', 'd', 'Weiteren Schüler buchen');
        (function(s, ds) {
          addBtnBooked.addEventListener('click', function(e) {
            e.stopPropagation();
            var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
            buildBookingForm(s, ds, allSlots, true);
          });
        })(slot, dateStr);

      }
    }

    /* Row click toggles detail */
    row.classList.add('is-clickable');
    row.addEventListener('click', function(e) {
      if (e.target.closest('.s-btn')) return;
      row.classList.toggle('is-open');
    });
    /* Group capacity */
    if (slot.groupMax && slot.groupMax > 1) {
      hasDetail = true;
      var bookedCount = (slot.students && slot.students.length) ? slot.students.length : (slot.studentId ? 1 : 0);
      var isFull = bookedCount >= slot.groupMax;
      var groupBar = document.createElement('div');
      groupBar.className = 'dv-v1-group-bar';
      var groupLabel = document.createElement('span');
      groupLabel.className = 'dv-v1-group-label';
      groupLabel.textContent = _tcT('groupLabel');
      var groupCount = document.createElement('span');
      groupCount.className = 'dv-v1-group-count ' + (isFull ? 'dv-v1-group-count--full' : 'dv-v1-group-count--ok');
      groupCount.textContent = bookedCount + ' / ' + slot.groupMax + (isFull ? ' \u2014 Voll' : ' Pl\u00e4tze belegt');
      groupBar.appendChild(groupLabel);
      groupBar.appendChild(groupCount);
      detail.appendChild(groupBar);
      /* Progress bar */
      var track = document.createElement('div');
      track.className = 'dv-v1-group-track-wrap';
      var trackInner = document.createElement('div');
      trackInner.className = 'dv-v1-group-track';
      var fill = document.createElement('div');
      fill.className = 'dv-v1-group-fill' + (isFull ? ' dv-v1-group-fill--full' : '');
      fill.style.width = Math.round(bookedCount / slot.groupMax * 100) + '%';
      trackInner.appendChild(fill);
      track.appendChild(trackInner);
      detail.appendChild(track);
    }

    /* Booked students */
    var bookedIds = (slot.students && slot.students.length) ? slot.students : (slot.studentId ? [slot.studentId] : []);
    if (bookedIds.length) {
      hasDetail = true;
      _addDetailSection('Gebucht');
      for (var _bi = 0; _bi < bookedIds.length; _bi++) {
        var _buid = bookedIds[_bi];
        var _bname = AppService.getDisplayNameSync(_buid) || _buid;
        _addDetailRow(_bname.charAt(0), _bname, 'dv-v1-tag-booked', 'Gebucht');
      }
      if (slot.groupMax && slot.groupMax > 1) {
        var freeCount = Math.max(0, slot.groupMax - bookedIds.length);
        if (freeCount > 0) {
          var freeNote = document.createElement('div');
          freeNote.className = 'dv-v1-detail-section';
          freeNote.textContent = _tcT('groupFreePrefix') + freeCount + ' ' + (freeCount === 1 ? _tcT('groupFreeSingular') : _tcT('groupFreePlural'));
          detail.appendChild(freeNote);
        }
      }
    }

    /* Visibility list */
    var visList = slot.visibilityList || [];
    if (slot.visibility === 'whitelist' && visList.length) {
      hasDetail = true;
      _addDetailSection('Whitelist \u2014 nur sichtbar f\u00fcr');
      for (var _wi = 0; _wi < visList.length; _wi++) {
        var _wname = AppService.getDisplayNameSync(visList[_wi]) || visList[_wi];
        _addDetailRow(_wname.charAt(0), _wname, 'dv-v1-tag-allowed', '\u2713 Sichtbar');
      }
    } else if (slot.visibility === 'blacklist' && visList.length) {
      hasDetail = true;
      _addDetailSection('Blacklist \u2014 nicht sichtbar f\u00fcr');
      for (var _bli = 0; _bli < visList.length; _bli++) {
        var _blname = AppService.getDisplayNameSync(visList[_bli]) || visList[_bli];
        _addDetailRow(_blname.charAt(0), _blname, 'dv-v1-tag-blocked', '\u2717 Gesperrt');
      }
    } else if (slot.visibility === 'blacklist-new') {
      info.appendChild(_tdvMakePill('dv-pill-blacklist', 'Blacklist + Keine Neuen'));
    } else if (slot.excludeNewStudents && !slot.visibility) {
      info.appendChild(_tdvMakePill('dv-pill-blacklist', 'Keine neuen Schüler'));
    } else if (slot.visibility === 'new-only') {
      hasDetail = true;
      _addDetailSection('Sichtbar f\u00fcr');
      var newRow = document.createElement('div');
      newRow.className = 'dv-v1-detail-row';
      var newIco = document.createElement('div');
      newIco.className = 'dv-v1-avatar dv-v1-avatar--new-only';
      newIco.textContent = '\u2605';
      var newNm = document.createElement('span');
      newNm.className = 'dv-v1-detail-name';
      newNm.textContent = _tcT('newOnlyStudentLabel');
      var newTg = document.createElement('span');
      newTg.className = 'dv-v1-detail-tag dv-v1-tag-new';
      newTg.textContent = _tcT('tagNew');
      newRow.appendChild(newIco);
      newRow.appendChild(newNm);
      newRow.appendChild(newTg);
      detail.appendChild(newRow);
    }

    if (!hasDetail) {
      var emptyNote = document.createElement('div');
      emptyNote.className = 'dv-v1-detail-empty';
      emptyNote.textContent = _tcT('emptyNoRestrictions');
      detail.appendChild(emptyNote);
    }

  } else if (status === 'timeout') {
    var wasAvail = slot ? (slot.baseStatus === 'available' || slot.baseStatus === 'recurring') : false;
    var swIcon = document.createElement('span');
    swIcon.className = 'dv-timeout-icon';
    swIcon.setAttribute('title', 'Timeout aktiv');
    swIcon.setAttribute('aria-hidden', 'true');
    swIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14.5 15.5"/><path d="M9 3h6M12 3v2"/></svg>';
    info.appendChild(swIcon);
    if (!isPastDay && slot) {
      var unblockBtn = _tdvMakeInlineBtn('Aufheben');
      (function(s, wasA) {
        unblockBtn.addEventListener('click', function() {
          if (wasA) {
            _stage(unblockBtn, 'amber', { action:'set-status', slot:s, newStatus:'available', newBase:'available' });
          } else {
            _stage(unblockBtn, 'amber', { action:'delete', slot:s, newStatus:'empty', newBase:'empty' });
          }
        });
      })(slot, wasAvail);
    }

  } else if (status === 'disabled') {
    /* disabled = slot exists but invisible to students. No label. */
    if (!isPastDay && slot) {
      var visBtnDis = _tdvMakeVisBtn(slot);
      visBtnDis.classList.add('s-btn--g');
      (function(s) {
        visBtnDis.addEventListener('click', function(e) { e.stopPropagation(); _openSlotVisibilityConfig(s, null); });
      })(slot);

      var eyeOffV1 = _makeSlotBtn('eyeOff', 'g', 'Verfügbar schalten');
      (function(s) {
        eyeOffV1.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(eyeOffV1, 'dark', { action:'set-status', slot:s, newStatus:'available', newBase:'available' });
        });
      })(slot);

      var addBtnDis = _makeSlotBtn('plus', 'l', 'Schüler direkt buchen');
      (function(s, ds) {
        addBtnDis.addEventListener('click', function(e) {
          e.stopPropagation();
          var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
          buildBookingForm(s, ds, allSlots, true);
        });
      })(slot, dateStr);
    }


  } else {
    /* Empty — no slot yet */
    var hint = document.createElement('span');
    hint.className = 'dv-empty-hint';
    hint.textContent = slot && slot._pendingAvail ? 'Wird gespeichert…' : 'Kein Slot angelegt';
    info.appendChild(hint);
    if (!isPastDay && !(slot && slot._pendingAvail)) {
      chevron = document.createElement('div');
      chevron.className = 's-btn s-btn--g';
      chevron.innerHTML = _SLOT_ICONS.chevronR;
      chevron.addEventListener('click', function(e) { e.stopPropagation(); row.classList.toggle('is-open'); });

      var visBtnEmpty = _tdvMakeVisBtn(null);
      (function(t, ds) {
        visBtnEmpty.addEventListener('click', function(e) {
          e.stopPropagation();
          /* Create slot as 'disabled' — gear opens Special Settings only.
             Availability is set separately via the Eye/Verfügbar button.
             If user cancels the config dialog the slot stays disabled (invisible). */
          AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t, _utc: true, status: 'disabled', baseStatus: 'disabled' }, function(err, newId) {
            if (err) { Toast.error(err.message || err); return; }
            var allUpdated = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
            var newSlot = allUpdated.filter(function(s) { return s.slotId === newId; })[0];
            if (newSlot) _openSlotVisibilityConfig(newSlot, null);
            _tdvRenderSlots(); renderCalendar(); renderDayPanel();
          });
        });
      })(time, dateStr);

      /* Fix 1 — "Verfügbar" setzt nur Availability (kein Buchungsdialog) */
      var verfBtn = _tdvMakeInlineBtn('Verf\u00fcgbar');
      (function(t, ds) {
        verfBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(verfBtn, 'dark', { action:'create', newStatus:'available', newBase:'available', date:ds, time:t });
        });
      })(time, dateStr);

      var toBtn = _tdvMakeInlineBtn('Timeout');
      (function(t, ds) {
        toBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          _stage(toBtn, 'dark', { action:'create', newStatus:'timeout', newBase:'timeout', date:ds, time:t });
        });
      })(time, dateStr);

      /* Fix 1 — "+" öffnet Booking-Form direkt ohne Slot zuerst anzulegen */
      var addBtnEmpty = document.createElement('button');
      addBtnEmpty = _makeSlotBtn('plus', 'l', 'Sch\u00fcler direkt buchen');
      (function(t, ds) {
        addBtnEmpty.addEventListener('click', function(e) {
          e.stopPropagation();
          /* status:'disabled' — teacher books on non-available slot, must not appear as available for students */
          AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t, _utc: true, status: 'disabled', baseStatus: 'disabled' }, function(err, newId) {
            if (err) { Toast.error(err.message || err); return; }
            var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
            var newSlot = allSlots.filter(function(s) { return s.slotId === newId; })[0];
            if (newSlot) buildBookingForm(newSlot, ds, allSlots, true);
          });
        });
      })(time, dateStr);


      row.classList.add('is-clickable');
      row.addEventListener('click', function(e) {
        if (e.target.closest('.s-btn')) return;
        row.classList.toggle('is-open');
      });
      var emptyNoteBlank = document.createElement('div');
      emptyNoteBlank.className = 'dv-v1-detail-empty';
      emptyNoteBlank.textContent = _tcT('emptyNoSlotYet');
      detail.appendChild(emptyNoteBlank);
    }
  }

  if (isPastDay && status !== 'booked') {
    info.appendChild(_tdvMakePill('dv-pill-past', 'Vergangen'));
  }

  rowTop.appendChild(timeCol);
  rowTop.appendChild(sep);
  rowTop.appendChild(info);
  rowTop.appendChild(action);
  row.appendChild(rowTop);
  if (chevron) row.appendChild(detail);
  return row;
}

function _tdvBuildRowV2(slot, time, dateStr, isPastDay) {
  var _localTime = _tTeacherTime(time, dateStr);
  var endTime    = AppService.slotEndTime(_localTime);
  var status     = slot ? (slot.status || slot.baseStatus) : 'empty';

  /* Row class */
  var rowClass = 'dv-slot-row ';
  if (isPastDay)                                             rowClass += 'dv-s-past';
  else if (status === 'booked')                              rowClass += 'dv-s-booked dv-s-booked-v2';
  else if (status === 'available' || status === 'recurring') rowClass += 'dv-s-' + status;
  else if (status === 'timeout') {
    var _tb = slot ? (slot.baseStatus || 'timeout') : 'timeout';
    rowClass += (_tb === 'available' || _tb === 'recurring') ? 'dv-s-timeout-avail' : 'dv-s-timeout';
  }
  else if (status === 'disabled') rowClass += 'dv-s-empty';
  else                            rowClass += 'dv-s-empty';

  /* Pending availability change → amber */
  if (slot && slot._pendingAvail) rowClass += ' dv-s-timeout';
  var row = document.createElement('div');
  row.className = rowClass.trim();
  row.setAttribute('role', 'listitem');
  row.setAttribute('data-utc-time', time);

  /* ── Unified structure: time | sep | info | action ── */
  var rowTop = document.createElement('div');
  rowTop.className = 'dv-v2-row-top';

  /* Time column */
  var timeCol = document.createElement('div');
  timeCol.className = 'dv-slot-time';
  timeCol.setAttribute('aria-label', _localTime + ' bis ' + endTime);
  var tStart = document.createElement('span');
  tStart.className = 'dv-time-start';
  tStart.textContent = _localTime;
  var tEnd = document.createElement('span');
  tEnd.className = 'dv-time-end';
  tEnd.textContent = '\u2013' + endTime;
  timeCol.appendChild(tStart);
  timeCol.appendChild(tEnd);

  /* Separator */
  var sep = document.createElement('div');
  sep.className = 'dv-slot-sep';
  sep.setAttribute('aria-hidden', 'true');

  /* Info column */
  var info = document.createElement('div');
  info.className = 'dv-slot-info';

  /* Action column — fixed 4-button set */
  var action = _buildSlotActions(slot, status, time, dateStr, isPastDay);

  /* ── Fill info by status ── */
  if (status === 'booked' && slot) {
    /* Booked: avatar stack + vis badges */
    var studentIds = (slot.students && slot.students.length) ? slot.students : (slot.studentId ? [slot.studentId] : []);
    var MAX_SHOWN = 3;
    var stack = document.createElement('div');
    stack.className = 'dv-v2-avatar-stack';
    for (var _ai = 0; _ai < Math.min(studentIds.length, MAX_SHOWN); _ai++) {
      (function(uid) {
        var av = document.createElement('div');
        av.className = 'dv-v2-avatar-stack-item';
        var photo = (typeof ProfileStore !== 'undefined') ? ProfileStore.getPhoto(uid) : null;
        if (photo) { av.innerHTML = '<img src="' + _esc(photo) + '" alt="">'; }
        else { var n = AppService.getDisplayNameSync(uid); av.textContent = n ? n.charAt(0).toUpperCase() : '?'; }
        stack.appendChild(av);
      })(studentIds[_ai]);
    }
    if (studentIds.length > MAX_SHOWN) {
      var more = document.createElement('div');
      more.className = 'dv-v2-avatar-stack-more';
      more.textContent = '+' + (studentIds.length - MAX_SHOWN);
      stack.appendChild(more);
    }
    var infoTop = document.createElement('div');
    infoTop.className = 'dv-v2-info-top';
    infoTop.appendChild(stack);
    info.appendChild(infoTop);

    var visBadgeBooked = _tdvBuildVisBadge(slot);
    if (visBadgeBooked) {
      var infoBadges = document.createElement('div');
      infoBadges.className = 'dv-v2-info-badges';
      infoBadges.appendChild(visBadgeBooked);
      info.appendChild(infoBadges);
    }

    /* Action: ⚙ + › — gear visible only if config set, chevron always */
    if (!isPastDay) {
      var gearBooked = _tdvMakeVisBtn(slot);
      if (!_slotHasVisConfig(slot)) {
        gearBooked.classList.add('s-btn--g');
      }
      (function(s) {
        gearBooked.addEventListener('click', function(e) {
          e.stopPropagation();
          _openSlotVisibilityConfig(s, null);
        });
      })(slot);

      /* + add student button */
      var addBtn = document.createElement('button');
      addBtn = _makeSlotBtn('plus', 'l', 'Sch\u00fcler hinzuf\u00fcgen');
      (function(s, ds) {
        addBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
          buildBookingForm(s, ds, allSlots, true);
        });
      })(slot, dateStr);
    }

    /* Chevron — always on booked rows */
    var chevron = _makeSlotBtn('chevron', 'd', 'Details anzeigen');

    /* Expandable student list */
    var studentList = document.createElement('div');
    studentList.className = 'dv-v2-student-list is-hidden';
    var sIds2 = (slot.students && slot.students.length) ? slot.students : (slot.studentId ? [slot.studentId] : []);
    for (var _vi = 0; _vi < sIds2.length; _vi++) {
      (function(uid) {
        var item = document.createElement('div');
        item.className = 'dv-v2-student-item';
        var avatar = document.createElement('div');
        avatar.className = 'dv-v2-avatar';
        var photo2 = (typeof ProfileStore !== 'undefined') ? ProfileStore.getPhoto(uid) : null;
        if (photo2) { avatar.innerHTML = '<img src="' + _esc(photo2) + '" alt="">'; }
        else { var name2 = AppService.getDisplayNameSync(uid); avatar.textContent = name2 ? name2.charAt(0).toUpperCase() : '?'; }
        var nameSpan = document.createElement('span');
        nameSpan.className = 'dv-v2-student-name';
        nameSpan.textContent = AppService.getDisplayNameSync(uid);
        var trashBtn = document.createElement('button');
        trashBtn.className = 'dv-v2-trash';
        trashBtn.setAttribute('aria-label', 'Buchung stornieren');
        trashBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M8 6V4h4v2M5 6l1 11a1 1 0 001 1h6a1 1 0 001-1l1-11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        (function(stuId, s) {
          trashBtn.addEventListener('click', function(e) { e.stopPropagation(); _openV2CancelDialog(stuId, s); });
        })(uid, slot);
        item.appendChild(avatar); item.appendChild(nameSpan); item.appendChild(trashBtn);
        studentList.appendChild(item);
      })(sIds2[_vi]);
    }

    /* Row is clickable to expand */
    row.classList.add('is-clickable');
    row.addEventListener('click', function(e) {
      if (e.target.closest('.s-btn')) return;
      var isOpen = !studentList.classList.contains('is-hidden');
      studentList.classList.toggle('is-hidden', isOpen);
      chevron.classList.toggle('dv-chevron-v2--open', !isOpen);
    });

    rowTop.appendChild(timeCol); rowTop.appendChild(sep); rowTop.appendChild(info); rowTop.appendChild(action);
    row.appendChild(rowTop);
    row.appendChild(studentList);
    return row;

  } else if (status === 'available' || status === 'recurring') {
    /* Available: gear (config) + eye (hide) + add button */
    if (!isPastDay) {
      if (slot) {
        var gearAvail = _tdvMakeVisBtn(slot);
        gearAvail.classList.add('s-btn--d');
        (function(s) {
          gearAvail.addEventListener('click', function(e) { e.stopPropagation(); _openSlotVisibilityConfig(s, null); });
        })(slot);

        /* Eye-open: slot is visible to students — click to hide (set disabled) */
        var eyeBtn = _makeSlotBtn('eye', 'd', 'F\u00fcr Sch\u00fcler ausblenden');
        (function(s, ds) {
          eyeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _stage(eyeBtn, 'light', { action:'set-status', slot:s, newStatus:'disabled', newBase:'disabled' });
          });
        })(slot, dateStr);
      }

      var addBtnA = document.createElement('button');
      addBtnA = _makeSlotBtn('plus', 'd', 'Sch\u00fcler hinzuf\u00fcgen');
      (function(s, t, ds) {
        addBtnA.addEventListener('click', function(e) {
          e.stopPropagation();
          if (s) {
            /* Slot already exists — open form directly */
            var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
            buildBookingForm(s, ds, allSlots, true);
          } else {
            /* No concrete slot yet (recurring only) — create as available since
               recurring implies the teacher intends availability here */
            AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t, _utc: true, status: 'available', baseStatus: 'available' }, function(err, newId) {
              if (err) { Toast.error(err.message || err); return; }
              var updated = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
              var newSlot = updated.filter(function(sl) { return sl.slotId === newId; })[0];
              if (newSlot) buildBookingForm(newSlot, ds, updated, true);
              _tdvRenderSlots(); renderCalendar(); renderDayPanel();
            });
          }
        });
      })(slot, time, dateStr);
    }

  } else if (status === 'timeout') {
    var swIcon = document.createElement('span');
    swIcon.className = 'dv-timeout-icon';
    swIcon.setAttribute('title', 'Timeout aktiv');
    swIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14.5 15.5"/><path d="M9 3h6M12 3v2"/></svg>';
    info.appendChild(swIcon);
    if (!isPastDay && slot) {
      var gearTimeout = _tdvMakeVisBtn(slot);
      gearTimeout.classList.add('s-btn--g');
      (function(s) {
        gearTimeout.addEventListener('click', function(e) { e.stopPropagation(); _openSlotVisibilityConfig(s, null); });
      })(slot);

      /* Fix 1 — Booking-Form direkt öffnen ohne Timeout aufzuheben */
      var addBtnTO = document.createElement('button');
      addBtnTO = _makeSlotBtn('plus', 'l', 'Sch\u00fcler direkt buchen');
      (function(s, ds) {
        addBtnTO.addEventListener('click', function(e) {
          e.stopPropagation();
          var allSlots = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
          buildBookingForm(s, ds, allSlots, true);
        });
      })(slot, dateStr);
    }

  } else {
    /* Empty/disabled — gear (config, creates disabled slot) + eye-slash (make available) + plus (book) */
    if (!isPastDay) {
      var gearEmpty = _tdvMakeVisBtn(slot);
      gearEmpty.classList.add('s-btn--g');
      (function(t, ds, existingSlot) {
        gearEmpty.addEventListener('click', function(e) {
          e.stopPropagation();
          if (existingSlot) {
            /* Slot already exists (disabled) — open config directly */
            _openSlotVisibilityConfig(existingSlot, null);
          } else {
            /* No slot yet — create as disabled, then open config */
            AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t, _utc: true, status: 'disabled', baseStatus: 'disabled' }, function(err, newId) {
              if (err) { Toast.error(err.message || err); return; }
              var updated = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
              var newSlot = updated.filter(function(s) { return s.slotId === newId; })[0];
              if (newSlot) _openSlotVisibilityConfig(newSlot, null);
              _tdvRenderSlots(); renderCalendar(); renderDayPanel();
            });
          }
        });
      })(time, dateStr, slot);

      /* Eye-slash: slot is hidden/non-existent — click to make available */
      var eyeOffBtn = _makeSlotBtn('eyeOff', 'g', 'Verf\u00fcgbar schalten');
      (function(t, ds, existingSlot) {
        eyeOffBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (existingSlot) {
            /* Slot exists (disabled) — just flip to available */
            _stage(eyeOffBtn, 'dark', { action:'set-status', slot:existingSlot, newStatus:'available', newBase:'available' });
          } else {
            /* No slot — create as available */
            _stage(eyeOffBtn, 'dark', { action:'create', newStatus:'available', newBase:'available', date:ds, time:t });
          }
        });
      })(time, dateStr, slot);

      var addBtnE = document.createElement('button');
      addBtnE = _makeSlotBtn('plus', 'l', 'Sch\u00fcler direkt buchen');
      (function(t, ds) {
        addBtnE.addEventListener('click', function(e) {
          e.stopPropagation();
          /* status:'disabled' so the slot is NOT visible as available for students.
             The teacher is creating a booking on a non-available slot on purpose.
             baseStatus:'disabled' ensures that after a cancel the slot returns to
             disabled (invisible for students), not available. */
          AppService.createSlot({ teacherId: currentUser.uid, date: ds, time: t, _utc: true, status: 'disabled', baseStatus: 'disabled' }, function(err, newId) {
            if (err) { Toast.error(err.message || err); return; }
            /* Reload allSlots AFTER create so new slot is included */
            var updated = AppService.getSlotsByTeacherDateSync(currentUser.uid, ds);
            var newSlot = updated.filter(function(s) { return s.slotId === newId; })[0];
            if (newSlot) buildBookingForm(newSlot, ds, updated, true);
          });
        });
      })(time, dateStr);
    }
  }

  if (isPastDay && status !== 'booked') {
    info.appendChild(_tdvMakePill('dv-pill-past', 'Vergangen'));
  }

  rowTop.appendChild(timeCol); rowTop.appendChild(sep); rowTop.appendChild(info); rowTop.appendChild(action);
  row.appendChild(rowTop);
  return row;
}

/* ── Booking detail modal ───────────────────────────────── */
function _tdvOpenBookingDetail(slot) {
  var sName   = slot.studentId ? AppService.getDisplayNameSync(slot.studentId) : 'Unbekannt';
  var student = slot.studentId ? AppService.getUserSync(slot.studentId) : null;
  var endTime = AppService.slotEndTime(slot.time);

  var bodyHTML =
    '<div class="move-dialog">' +
      '<p class="move-dialog-info"><strong>' + _esc(sName) + '</strong></p>' +
      (student && student.email ? '<p>' + _esc(student.email) + '</p>' : '') +
      '<p>' + _esc(_tTeacherTime(slot.time, slot.date)) + ' – ' + _esc(_tTeacherEndTime(slot.time, slot.date)) + ' &nbsp;&bull;&nbsp; ' + _esc(slot.date) + '</p>' +
      (slot.confirmedAt ? '<p style="margin-top:8px;color:var(--status-confirmed-tx)">\u2713 Best\u00e4tigt</p>' : '') +
    '</div>';

  var footerHTML =
    '<button class="btn btn-ghost" id="modal-cancel">Schlie\u00dfen</button>' +
    (!slot.confirmedAt
      ? '<button class="btn btn-danger" id="modal-storno">Buchung stornieren</button>'
      : '');

  var result = Modal.show({ title: 'Buchungsdetail', bodyHTML: bodyHTML, footerHTML: footerHTML });
  document.getElementById('modal-cancel').addEventListener('click', result.close);

  var stornoEl = document.getElementById('modal-storno');
  if (stornoEl) {
    (function(s) {
      stornoEl.addEventListener('click', function() {
        AppService.cancelSlotWithPolicy(s.slotId, 'teacher', function(e) {
          if (e) { Toast.error(e.message || e); return; }
          result.close();
          _tdvRenderSlots(); _scheduleRender({ calendar: true, dayPanel: true });
        });
      });
    })(slot);
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
/* Generate all 48 half-hour slots 00:00 – 23:30 */
/* _buildLocalOrderedUtcTimes — defined in ui.js, available as window._buildLocalOrderedUtcTimes */

function _tdvBuildAllDayTimes() {
  /* Delegates to shared function using current Day View date and user */
  var dateStr = _tdvDate ? fmtDate(_tdvDate) : fmtDate(new Date());
  return _buildLocalOrderedUtcTimes(dateStr, currentUser ? currentUser.uid : null);
}

/* Small inline ghost button — reuses avail-row style */
/* ── Icon button factory — 40x40 square, no border-radius ──────────────
   variant: "l" light, "d" dark (glass), "g" ghost, "amber"
   Returns a <button> with .s-btn .s-btn--{variant} and an SVG icon. */
var _SLOT_ICONS = {
  gear:    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.8" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  eye:     '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>',
  eyeOff:  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 2l16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6.1 6.2C3.8 7.6 2 10 2 10s3.5 6 8 6c1.7 0 3.2-.6 4.5-1.5M9 4.1C9.3 4 9.6 4 10 4c4.5 0 8 6 8 6a13.5 13.5 0 01-2.1 2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.5 9.5a2.5 2.5 0 003 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  timeout: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="11.5" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M10 8v3.5l2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.5 2.5h5M10 2.5v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  undoTo:  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="11" cy="11.5" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M11 8v3.5l2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 4L4 7l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus:    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  chevron: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevronR:'<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M8 6l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function _makeSlotBtn(icon, variant, ariaLabel) {
  var btn = document.createElement('button');
  btn.className = 's-btn s-btn--' + (variant || 'l');
  btn.setAttribute('aria-label', ariaLabel || '');
  btn.setAttribute('title', ariaLabel || '');
  btn.innerHTML = _SLOT_ICONS[icon] || '';
  return btn;
}

/* Legacy aliases — keep call-sites working */
function _tdvMakeInlineBtn(label) {
  /* Map old text labels to icon buttons */
  var map = {
    'Deaktivieren': { icon: 'eyeOff',  label: 'Slot deaktivieren' },
    'Verfügbar':    { icon: 'eye',      label: 'Verfügbar schalten' },
    'Hinzufügen':   { icon: 'eye',      label: 'Verfügbar schalten' },
    'Timeout':      { icon: 'timeout',  label: 'Timeout setzen' },
    'Aufheben':     { icon: 'undoTo',   label: 'Timeout aufheben' }
  };
  var m = map[label];
  if (m) return _makeSlotBtn(m.icon, 'l', m.label);
  /* Fallback: render as ghost with text */
  var btn = document.createElement('button');
  btn.className = 's-btn s-btn--g';
  btn.textContent = label;
  return btn;
}

/* Gear button — now uses s-btn instead of dv-vis-btn */
function _tdvMakeVisBtn(slot) {
  var btn = _makeSlotBtn('gear', 'l', 'Sichtbarkeit & Gruppe');
  if (_slotHasVisConfig(slot)) btn.classList.add('is-active');
  return btn;
}

function _slotHasVisConfig(slot) {
  if (!slot) return false;
  if (slot.visibility && slot.visibility !== 'public') return true;
  if (slot.excludeNewStudents) return true;
  if (slot.groupMax && slot.groupMax > 1) return true;
  return false;
}

/* ── Visibility badge pill (shown in info column when config active) ── */
function _tdvBuildVisBadge(slot) {
  if (!slot || !_slotHasVisConfig(slot)) return null;
  var frag = document.createDocumentFragment();
  var badgeDefs = [
    { check: slot.visibility === 'new-only',       mod: 'new-only',  label: 'Nur neue Schüler' },
    { check: slot.visibility === 'whitelist',      mod: 'whitelist', label: 'Whitelist' + (slot.visibilityList && slot.visibilityList.length ? ' (' + slot.visibilityList.length + ')' : '') },
    { check: slot.visibility === 'blacklist',      mod: 'blacklist', label: 'Blacklist' + (slot.visibilityList && slot.visibilityList.length ? ' (' + slot.visibilityList.length + ')' : '') },
    { check: slot.visibility === 'blacklist-new',  mod: 'bl-new',    label: 'Blacklist + Keine Neuen' + (slot.visibilityList && slot.visibilityList.length ? ' (' + slot.visibilityList.length + ')' : '') },
    { check: !slot.visibility && slot.excludeNewStudents, mod: 'no-new', label: 'Keine neuen Schüler' },
    { check: slot.groupMax && slot.groupMax > 1,   mod: 'group',     label: 'Gruppe max. ' + slot.groupMax }
  ];
  badgeDefs.forEach(function(d) {
    if (!d.check) return;
    var badge = document.createElement('span');
    badge.className = 'dv-vis-badge dv-vis-badge--' + d.mod;
    var sq = document.createElement('span');
    sq.className = 'dv-vis-badge__dot';
    badge.appendChild(sq);
    badge.appendChild(document.createTextNode(d.label));
    frag.appendChild(badge);
  });
  return frag;
}

/* ── Slot Visibility Config Modal ── */
function _openSlotVisibilityConfig(slot, onSave) {
  var slotId  = slot ? slot.slotId : null;
  var vis     = (slot && slot.visibility) ? slot.visibility : 'public';
  var visList = (slot && slot.visibilityList) ? slot.visibilityList.slice() : [];
  var grpMax  = (slot && slot.groupMax && slot.groupMax > 1) ? slot.groupMax : 1;

  /* If opened from my-students with a pre-selected student, force whitelist mode */
  if (gridVisStudents && gridVisStudents.length) {
    if (vis === 'public' || vis === '') {
      vis = 'whitelist';
      visList = gridVisStudents.slice();
    } else if (vis === 'whitelist') {
      /* Merge pre-selected into existing whitelist */
      for (var _gi = 0; _gi < gridVisStudents.length; _gi++) {
        if (visList.indexOf(gridVisStudents[_gi]) === -1) visList.push(gridVisStudents[_gi]);
      }
    }
    gridVisStudents = []; /* consume — only pre-select on first open */
  }

  /* All students this teacher has a selection with */
  var myStudents = [];
  AppService.getSelectionsByTeacher(currentUser.uid, function(err, sels) {
    if (!err && sels) {
      for (var i = 0; i < sels.length; i++) {
        var u = AppService.getUserSync(sels[i].studentId);
        if (u) myStudents.push(u);
      }
    }
    _showVisModal(slot, vis, visList, grpMax, myStudents, onSave);
  });
}

function _showVisModal(slot, initVis, initList, initGrp, students, onSave) {
  /* State — all options independent and combinable */
  var newOnly    = (initVis === 'new-only');
  var whitelist  = (initVis === 'whitelist');
  var blacklist  = (initVis === 'blacklist' || initVis === 'blacklist-new');
  /* excludeNew: also block new students from a blacklist slot */
  var excludeNew = (initVis === 'blacklist-new') || (slot && !!slot.excludeNewStudents);
  var grpOn      = (initGrp > 1);
  var whiteList  = (whitelist ? initList.slice() : []);
  var blackList  = (blacklist ? initList.slice() : []);
  var grpMax     = (initGrp > 1 ? initGrp : 3);
  var searchQ   = { white: '', black: '' };

  function _esc2(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _buildStudentListHTML(key, q) {
    var sel = (key === 'white') ? whiteList : blackList;
    var filtered = students.filter(function(s) {
      return !q || (AppService.getDisplayNameSync(s.uid) || s.uid).toLowerCase().indexOf(q.toLowerCase()) !== -1;
    });
    if (!filtered.length) return '<div class="svc-combo-empty">Kein Sch\u00fcler gefunden</div>';
    var html = '';
    filtered.forEach(function(s) {
      var name    = _esc2(AppService.getDisplayNameSync(s.uid) || s.uid);
      var checked = sel.indexOf(s.uid) !== -1 ? ' checked' : '';
      var bookings = AppService.getSlotsByStudentSync(s.uid).filter(function(sl) { return sl.teacherId === currentUser.uid && sl.status === 'booked'; }).length;
      html += '<label class="svc-combo-row">' +
        '<input type="checkbox" data-uid="' + _esc2(s.uid) + '"' + checked + '>' +
        '<div class="svc-avatar">' + _esc2((name.charAt(0) || '?').toUpperCase()) + '</div>' +
        '<span class="svc-stu-name">' + name + '</span>' +
        '<span class="svc-stu-meta">' + bookings + ' Buchung' + (bookings !== 1 ? 'en' : '') + '</span>' +
        '</label>';
    });
    return html;
  }

  function _buildChipsHTML(key) {
    var list = (key === 'white') ? whiteList : blackList;
    return list.map(function(uid) {
      var name = _esc2(AppService.getDisplayNameSync(uid) || uid);
      var init = (name.charAt(0) || '?').toUpperCase();
      return '<span class="svc-chip">' +
        '<span class="svc-chip-av">' + _esc2(init) + '</span>' +
        name +
        '<button class="svc-chip-x" data-uid="' + _esc2(uid) + '" type="button">\u00d7</button>' +
        '</span>';
    }).join('');
  }

  /* ── Build HTML ── */
  /* Card: Nur neue Schüler — toggle only, no body */
  function _cardNew() {
    return '<div class="svc-card' + (newOnly ? ' is-active' : '') + '" id="svc-card-new" style="--active-color:#8b5cf6;">' +
      '<div class="svc-card-header" id="svc-hdr-new">' +
        '<div class="svc-color-sq" style="background:#8b5cf6;"></div>' +
        '<div class="svc-card-label"><div class="svc-card-title">Nur neue Sch\u00fcler</div><div class="svc-card-desc">Nur Sch\u00fcler ohne bisherige Buchung sichtbar</div></div>' +
        '<div class="svc-toggle' + (newOnly ? ' on' : '') + '" id="svc-tog-new" style="--active-color:#8b5cf6;"></div>' +
      '</div>' +
    '</div>';
  }

  /* Card: Nicht für neue Schüler — toggle only, no body */
  function _cardExcludeNew() {
    return '<div class="svc-card' + (excludeNew ? ' is-active' : '') + '" id="svc-card-excnew" style="--active-color:#e11d48;">' +
      '<div class="svc-card-header" id="svc-hdr-excnew">' +
        '<div class="svc-color-sq" style="background:#e11d48;"></div>' +
        '<div class="svc-card-label"><div class="svc-card-title">Nicht f\u00fcr neue Sch\u00fcler</div><div class="svc-card-desc">Sch\u00fcler ohne bisherige Buchung k\u00f6nnen diesen Slot nicht sehen</div></div>' +
        '<div class="svc-toggle' + (excludeNew ? ' on' : '') + '" id="svc-tog-excnew" style="--active-color:#e11d48;"></div>' +
      '</div>' +
    '</div>';
  }

  /* Card with combobox — header click opens/closes body directly (no toggle switch) */
  function _cardWithCombo(key, color, title, desc, isOpen, listHTML, chipsHTML) {
    return '<div class="svc-card' + (isOpen ? ' is-active' : '') + '" id="svc-card-' + key + '" style="--active-color:' + color + ';">' +
      '<div class="svc-card-header" id="svc-hdr-' + key + '">' +
        '<div class="svc-color-sq" style="background:' + color + ';"></div>' +
        '<div class="svc-card-label"><div class="svc-card-title">' + title + '</div><div class="svc-card-desc">' + desc + '</div></div>' +
        '<span class="svc-chev' + (isOpen ? ' is-open' : '') + '" id="svc-chev-' + key + '">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '</span>' +
      '</div>' +
      '<div id="svc-body-' + key + '" class="svc-body' + (isOpen ? ' is-open' : '') + '">' +
        '<div id="svc-combo-wrap-' + key + '">' +
          '<div class="svc-combo" id="svc-combo-' + key + '">' +
            '<button type="button" class="svc-combo-trigger" id="svc-trig-' + key + '">' +
              '<span class="svc-combo-label" id="svc-label-' + key + '">Sch\u00fcler w\u00e4hlen\u2026</span>' +
              '<span class="svc-combo-count hidden" id="svc-count-' + key + '">0</span>' +
              '<span class="svc-combo-chevron"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>' +
            '</button>' +
            '<div class="svc-combo-panel" id="svc-panel-' + key + '">' +
              '<div class="svc-combo-search"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
              '<input type="text" id="svc-search-' + key + '" placeholder="Sch\u00fcler suchen\u2026" autocomplete="off"></div>' +
              '<div class="svc-combo-list" id="svc-list-' + key + '">' + listHTML + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="svc-chips" id="svc-chips-' + key + '">' + chipsHTML + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* Card with combobox + "Neue Schüler" checkbox at top of body */
  function _cardWithComboAndNewCheck(key, color, title, desc, isOpen, listHTML, chipsHTML) {
    var newCheck = '<label class="svc-new-check-row">' +
      '<input type="checkbox" id="svc-excnew-cb" ' + (excludeNew ? 'checked' : '') + '>' +
      '<span class="svc-new-check-label">Neue Sch\u00fcler ausschlie\u00dfen</span>' +
      '<span class="svc-new-check-desc">Sch\u00fcler ohne bisherige Buchung k\u00f6nnen diesen Slot nicht sehen</span>' +
    '</label>';
    return '<div class="svc-card' + (isOpen ? ' is-active' : '') + '" id="svc-card-' + key + '" style="--active-color:' + color + '">' +
      '<div class="svc-card-header" id="svc-hdr-' + key + '">' +
        '<div class="svc-color-sq" style="background:' + color + ';"></div>' +
        '<div class="svc-card-label"><div class="svc-card-title">' + title + '</div><div class="svc-card-desc">' + desc + '</div></div>' +
        '<span class="svc-chev' + (isOpen ? ' is-open' : '') + '" id="svc-chev-' + key + '">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '</span>' +
      '</div>' +
      '<div id="svc-body-' + key + '" class="svc-body' + (isOpen ? ' is-open' : '') + '">' +
        newCheck +
        '<div id="svc-combo-wrap-' + key + '">' +
          '<div class="svc-combo" id="svc-combo-' + key + '">' +
            '<button type="button" class="svc-combo-trigger" id="svc-trig-' + key + '">' +
              '<span class="svc-combo-label" id="svc-label-' + key + '">Sch\u00fcler w\u00e4hlen\u2026</span>' +
              '<span class="svc-combo-count hidden" id="svc-count-' + key + '">0</span>' +
              '<span class="svc-combo-chevron"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>' +
            '</button>' +
            '<div class="svc-combo-panel" id="svc-panel-' + key + '">' +
              '<div class="svc-combo-search"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
              '<input type="text" id="svc-search-' + key + '" placeholder="Sch\u00fcler suchen\u2026" autocomplete="off"></div>' +
              '<div class="svc-combo-list" id="svc-list-' + key + '">' + listHTML + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="svc-chips" id="svc-chips-' + key + '">' + chipsHTML + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* Card: Gruppenunterricht — header click toggles, body shows number input */
  function _cardGroup() {
    return '<div class="svc-card' + (grpOn ? ' is-active' : '') + '" id="svc-card-group" style="--active-color:#10b981;">' +
      '<div class="svc-card-header" id="svc-hdr-group">' +
        '<div class="svc-color-sq" style="background:#10b981;"></div>' +
        '<div class="svc-card-label"><div class="svc-card-title">Gruppenunterricht</div><div class="svc-card-desc">Mehrere Schüler können diesen Slot buchen</div></div>' +
        '<div class="svc-toggle' + (grpOn ? ' on' : '') + '" id="svc-tog-group" style="--active-color:#10b981;"></div>' +
      '</div>' +
      '<div id="svc-body-group" class="svc-body' + (grpOn ? ' is-open' : '') + '">' +
        '<div class="svc-grp-row">' +
          '<div class="svc-grp-label-wrap"><div class="svc-grp-label-title">Maximale Teilnehmerzahl</div><div class="svc-grp-label-desc">Slot bleibt buchbar solange Plätze frei sind</div></div>' +
          '<input type="number" id="svc-grp-max" class="svc-max-input" value="' + grpMax + '" min="2" max="20">' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var bodyHTML =
    '<div class="svc-cards-wrap">' +
    _cardNew() +
    _cardExcludeNew() +
    _cardWithCombo('white', '#0ea5e9', 'Nur bestimmte Schüler', 'Whitelist — Slot nur für Ausgewählte sichtbar', whitelist, _buildStudentListHTML('white', ''), _buildChipsHTML('white')) +
    _cardWithComboAndNewCheck('black', '#f97316', 'Nicht für bestimmte Schüler', 'Blacklist — Slot für alle außer Ausgewählten sichtbar', blacklist, _buildStudentListHTML('black', ''), _buildChipsHTML('black')) +
    _cardGroup() +
    '</div>';

  /* ── Open the vis bottom sheet ── */
  var _overlay  = document.getElementById('vis-overlay');
  var _scroll   = document.getElementById('vis-sheet-scroll');
  var _titleEl  = document.getElementById('vis-sheet-title');
  var _subEl    = document.getElementById('vis-sheet-subtitle');
  var _saveBtn  = document.getElementById('vis-save-btn');
  var _cancelBtn= document.getElementById('vis-cancel-btn');

  if (!_overlay || !_scroll) { Toast.error('Vis-Sheet nicht gefunden.'); return; }

  /* Populate title + subtitle with slot time/date */
  if (_titleEl) _titleEl.textContent = _tcT('visSheetTitle');
  if (_subEl && slot) {
    var _slotDate = slot.date || '';
    var _slotTime = slot.time || '';
    if (_slotDate && _slotTime && typeof TimezoneService !== 'undefined') {
      var _tz  = TimezoneService.getUserTimezone(currentUser.uid);
      var _loc = TimezoneService.utcToLocal(_slotTime, _slotDate, _tz);
      _subEl.textContent = _loc.localTime + ' \u00b7 ' + _slotDate;
    } else {
      _subEl.textContent = _slotTime + (_slotDate ? ' \u00b7 ' + _slotDate : '');
    }
  }

  _scroll.innerHTML = bodyHTML;
  _overlay.classList.add('is-open');
  document.body.classList.add('modal-open');

  function _closeSheet() {
    _overlay.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    _overlay.removeEventListener('click', _outsideClick);
    document.removeEventListener('keydown', _onSheetKey);
  }
  function _outsideClick(e) { if (e.target === _overlay) _closeSheet(); }
  function _onSheetKey(e)   { if (e.key === 'Escape') _closeSheet(); }
  _overlay.addEventListener('click', _outsideClick);
  document.addEventListener('keydown', _onSheetKey);

  /* Wire cancel */
  if (_cancelBtn) {
    /* Remove old listener by replacing node */
    var _newCancel = _cancelBtn.cloneNode(true);
    _cancelBtn.parentNode.replaceChild(_newCancel, _cancelBtn);
    _newCancel.addEventListener('click', _closeSheet);
  }

  /* Bind save (wired below after other bindings set up) */
  var _result = { close: _closeSheet };

  document.getElementById('svc-cancel') && document.getElementById('svc-cancel').addEventListener('click', _closeSheet);

  /* ── Bind: Nur neue Schüler toggle ── */
  var newHdr = document.getElementById('svc-hdr-new');
  if (newHdr) {
    newHdr.addEventListener('click', function() {
      newOnly = !newOnly;
      var card = document.getElementById('svc-card-new');
      var tog  = document.getElementById('svc-tog-new');
      if (newOnly) { card.classList.add('is-active'); tog.classList.add('on'); }
      else { card.classList.remove('is-active'); tog.classList.remove('on'); }
    });
  }

  /* ── Bind: Nicht für neue Schüler toggle ── */
  var excNewHdr = document.getElementById('svc-hdr-excnew');
  if (excNewHdr) {
    excNewHdr.addEventListener('click', function() {
      excludeNew = !excludeNew;
      var card = document.getElementById('svc-card-excnew');
      var tog  = document.getElementById('svc-tog-excnew');
      if (excludeNew) { card.classList.add('is-active'); tog.classList.add('on'); }
      else { card.classList.remove('is-active'); tog.classList.remove('on'); }
      /* Keep inline checkbox in sync */
      var cb = document.getElementById('svc-excnew-cb');
      if (cb) cb.checked = excludeNew;
    });
  }

  /* ── Bind: "Neue Schüler ausschließen" checkbox inside blacklist body ── */
  var excCb = document.getElementById('svc-excnew-cb');
  if (excCb) {
    excCb.addEventListener('change', function() {
      excludeNew = excCb.checked;
      /* Sync standalone card too */
      var card = document.getElementById('svc-card-excnew');
      var tog  = document.getElementById('svc-tog-excnew');
      if (card) { if (excludeNew) card.classList.add('is-active'); else card.classList.remove('is-active'); }
      if (tog)  { if (excludeNew) tog.classList.add('on');        else tog.classList.remove('on'); }
    });
  }

  /* ── Bind: Whitelist + Blacklist — header click = open/close (no toggle) ── */
  (function() {
    var _comboPairs = [
      { key: 'white' },
      { key: 'black' }
    ];
    for (var _ci = 0; _ci < _comboPairs.length; _ci++) {
      (function(key) {
        var hdr  = document.getElementById('svc-hdr-' + key);
        var body = document.getElementById('svc-body-' + key);
        var card = document.getElementById('svc-card-' + key);
        var chev = document.getElementById('svc-chev-' + key);
        if (!hdr) return;
        hdr.addEventListener('click', function() {
          var isOpen = body.classList.contains('is-open');
          if (isOpen) {
            body.classList.remove('is-open');
            card.classList.remove('is-active');
            if (chev) chev.classList.remove('is-open');
          } else {
            body.classList.add('is-open');
            card.classList.add('is-active');
            if (chev) chev.classList.add('is-open');
          }
        });
        _bindCombo(key);
      })(_comboPairs[_ci].key);
    }
  })();

  /* ── Bind: Gruppenunterricht toggle ── */
  var grpHdr = document.getElementById('svc-hdr-group');
  if (grpHdr) {
    grpHdr.addEventListener('click', function() {
      grpOn = !grpOn;
      var gCard = document.getElementById('svc-card-group');
      var gTog  = document.getElementById('svc-tog-group');
      var gBody = document.getElementById('svc-body-group');
      if (grpOn) { gCard.classList.add('is-active'); gTog.classList.add('on'); gBody.classList.add('is-open'); }
      else { gCard.classList.remove('is-active'); gTog.classList.remove('on'); gBody.classList.remove('is-open'); }
    });
  }

  /* ── Combobox logic ── */
  function _positionPanel(key) {
    var trig  = document.getElementById('svc-trig-' + key);
    var panel = document.getElementById('svc-panel-' + key);
    if (!trig || !panel) return;
    var rect = trig.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top      = rect.bottom + 'px';
    panel.style.left     = rect.left + 'px';
    panel.style.width    = rect.width + 'px';
    panel.style.zIndex   = '99999';
  }

  function _bindCombo(key) {
    var trig   = document.getElementById('svc-trig-' + key);
    var panel  = document.getElementById('svc-panel-' + key);
    var search = document.getElementById('svc-search-' + key);
    var list   = document.getElementById('svc-list-' + key);
    if (!trig) return;

    trig.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = trig.classList.contains('is-open');
      /* Close other */
      var otherKey = key === 'white' ? 'black' : 'white';
      var otherTrig = document.getElementById('svc-trig-' + otherKey);
      if (otherTrig) otherTrig.classList.remove('is-open');
      trig.classList.toggle('is-open', !isOpen);
      if (!isOpen) {
        _positionPanel(key);
        if (search) setTimeout(function(){ search.focus(); }, 40);
      }
    });

    if (search) {
      search.addEventListener('input', function() {
        list.innerHTML = _buildStudentListHTML(key, search.value);
        _rebindCheckboxes(key);
      });
      search.addEventListener('click', function(e) { e.stopPropagation(); });
    }
    _rebindCheckboxes(key);
  }

  function _getList(key) { return key === 'white' ? whiteList : blackList; }
  function _setList(key, arr) { if (key === 'white') whiteList = arr; else blackList = arr; }

  function _rebindCheckboxes(key) {
    var list = document.getElementById('svc-list-' + key);
    if (!list) return;
    var boxes = list.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) {
      (function(cb) {
        cb.addEventListener('change', function() {
          var uid = cb.getAttribute('data-uid');
          var arr = _getList(key).slice();
          if (cb.checked) { if (arr.indexOf(uid) === -1) arr.push(uid); }
          else { arr = arr.filter(function(u) { return u !== uid; }); }
          _setList(key, arr);
          _updateTriggerLabel(key);
          var chips = document.getElementById('svc-chips-' + key);
          if (chips) { chips.innerHTML = _buildChipsHTML(key); _rebindChips(key); }
        });
      })(boxes[i]);
    }
  }

  function _rebindChips(key) {
    var container = document.getElementById('svc-chips-' + key);
    if (!container) return;
    var xBtns = container.querySelectorAll('.svc-chip-x');
    for (var i = 0; i < xBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var uid = btn.getAttribute('data-uid');
          var arr = _getList(key).filter(function(u) { return u !== uid; });
          _setList(key, arr);
          _updateTriggerLabel(key);
          var chips = document.getElementById('svc-chips-' + key);
          if (chips) { chips.innerHTML = _buildChipsHTML(key); _rebindChips(key); }
          var cb2 = document.querySelector('#svc-list-' + key + ' input[data-uid="' + uid + '"]');
          if (cb2) cb2.checked = false;
        });
      })(xBtns[i]);
    }
  }

  function _updateTriggerLabel(key) {
    var arr     = _getList(key);
    var labelEl = document.getElementById('svc-label-' + key);
    var countEl = document.getElementById('svc-count-' + key);
    if (!labelEl || !countEl) return;
    if (!arr.length) {
      labelEl.textContent = 'Sch\u00fcler w\u00e4hlen\u2026';
      countEl.classList.add('hidden');
    } else {
      var names = arr.map(function(uid) { return AppService.getDisplayNameSync(uid) || uid; });
      labelEl.textContent = names.join(', ');
      countEl.textContent = arr.length;
      countEl.classList.remove('hidden');
    }
  }

  /* Update trigger labels for pre-filled lists */
  _updateTriggerLabel('white');
  _updateTriggerLabel('black');

  /* Close combos on outside click */
  document.addEventListener('click', function _svcOutside() {
    var tw = document.getElementById('svc-trig-white');
    var tb = document.getElementById('svc-trig-black');
    if (tw) tw.classList.remove('is-open');
    if (tb) tb.classList.remove('is-open');
    document.removeEventListener('click', _svcOutside);
  });

  /* ── Save ── */
  var _saveEl = document.getElementById('vis-save-btn');
  if (_saveEl) {
    var _newSave = _saveEl.cloneNode(true);
    _saveEl.parentNode.replaceChild(_newSave, _saveEl);
    _newSave.addEventListener('click', function() {
      var grpInput = document.getElementById('svc-grp-max');
      var finalGrp = grpOn ? (parseInt(grpInput ? grpInput.value : grpMax, 10) || grpMax) : 1;

      var finalVis  = 'public';
      var finalList = [];
      if (newOnly) {
        finalVis = 'new-only';
      } else {
        var wBodyOpen = document.getElementById('svc-body-white') && document.getElementById('svc-body-white').classList.contains('is-open');
        var bBodyOpen = document.getElementById('svc-body-black') && document.getElementById('svc-body-black').classList.contains('is-open');
        if (wBodyOpen && whiteList.length > 0) {
          finalVis = 'whitelist'; finalList = whiteList;
        } else if (bBodyOpen) {
          var _excNewCb = document.getElementById('svc-excnew-cb');
          var _excNewOn = _excNewCb ? _excNewCb.checked : excludeNew;
          if (blackList.length > 0 || _excNewOn) {
            finalVis  = _excNewOn ? 'blacklist-new' : 'blacklist';
            finalList = blackList;
          }
        } else if (excludeNew) {
          finalVis = 'blacklist-new';
        }
      }

      var patch = {
        visibility:         finalVis !== 'public' ? finalVis : null,
        visibilityList:     finalList,
        excludeNewStudents: excludeNew || false,
        groupMax:           finalGrp > 1 ? finalGrp : null
      };
      if (slot && slot.slotId) {
        AppService.updateSlot(slot.slotId, patch, function(e) {
          if (e) { Toast.error(e.message || e); return; }
          _closeSheet();
          if (onSave) onSave();
          _tdvRenderSlots(); renderCalendar(); renderDayPanel();
          if (activeTeacherView === 'all-bookings') renderAllBookings();
          renderStudentList();
          var gridOverlay = document.getElementById('slot-grid-overlay');
          if (gridOverlay && gridOverlay.classList.contains('is-open')) renderGridTable();
        });
      } else {
        _closeSheet();
      }
    });
  }
}

function _tdvMakePill(cls, label) {
  var pill = document.createElement('span');
  pill.className = 'dv-pill ' + cls;
  pill.setAttribute('role', 'status');
  var dot = document.createElement('span');
  dot.className = 'dv-pill-dot';
  dot.setAttribute('aria-hidden', 'true');
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode(label));
  return pill;
}

function _tdvMakeActionBtn(cls, label, svgHTML) {
  var btn = document.createElement('button');
  btn.className = 'dv-action-btn ' + cls;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = svgHTML;
  return btn;
}

function _svgArrow() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
}
function _svgPlus() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
}
function _svgLock() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
}
function _svgRefresh() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
}
function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Wire up overlay buttons — called from init after DOM ready */
function _tdvInitListeners() {
  document.getElementById('tdv-back-btn').addEventListener('click', closeTeacherDayView);
  document.getElementById('tdv-prev-day').addEventListener('click', function() {
    if (!_tdvDate) return;
    var d = new Date(_tdvDate);
    d.setDate(d.getDate() - 1);
    openTeacherDayView(d);
  });
  document.getElementById('tdv-next-day').addEventListener('click', function() {
    if (!_tdvDate) return;
    var d = new Date(_tdvDate);
    d.setDate(d.getDate() + 1);
    openTeacherDayView(d);
  });
}

/* ══════════════════════════════════════════════════════════
   LEGEND DIALOG — IIFE singleton
   Opened by the ? FAB, shows icon button legend as a
   bottom sheet. ESC + outside click close it.
══════════════════════════════════════════════════════════ */
var LegendDialog = (function() {
  'use strict';

  var _overlay = null;

  function _showError(context, err) {
    Toast.error('[LegendDialog:' + context + '] ' + (err && err.message ? err.message : String(err)));
  }

  function open() {
    try {
      _overlay = document.getElementById('legend-overlay');
      if (!_overlay) { _showError('open', new Error('legend-overlay nicht gefunden')); return; }
      _overlay.classList.add('is-open');
      _overlay.addEventListener('click', _outsideClick);
      document.addEventListener('keydown', _onKey);
    } catch (e) { _showError('open', e); }
  }

  function close() {
    try {
      if (!_overlay) _overlay = document.getElementById('legend-overlay');
      if (!_overlay) return;
      _overlay.classList.remove('is-open');
      _overlay.removeEventListener('click', _outsideClick);
      document.removeEventListener('keydown', _onKey);
    } catch (e) { _showError('close', e); }
  }

  function _outsideClick(e) {
    if (e.target === _overlay) close();
  }

  function _onKey(e) {
    if (e.key === 'Escape') close();
  }

  return { open: open, close: close };
}());
