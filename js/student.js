/**
 * student.js — Student View
 *
 * Booking via week grid (same layout as teacher).
 * Cell states (student perspective):
 *   gc-available  — green,  clickable → book instantly
 *   gc-mine       — navy,   clickable → cancel
 *   gc-empty      — grey,   not clickable
 */

/* ── i18n ─────────────────────────────────────────────── */
var _stuI18n = {};

var _STU_I18N_DEFAULTS = {
  tabMyTeachers:        'Meine Lehrer',
  tabBookLesson:        'Stunde buchen',
  tabMyBookings:        'Meine Buchungen',
  tabWallet:            'Wallet',
  tabDashboard:         'Dashboard',
  pageTitle:            'Meine Stunden',
  pageSubtitle:         'Lehrer finden und Stunden buchen.',
  statMyTeachers:       'Meine Lehrer',
  statBooked:           'Gebucht',
  cardSelected:         'Ausgew\u00e4hlt',
  cardAvailSlots:       'verf\u00fcgbarer Slot',
  cardAvailSlotsPlural: 'verf\u00fcgbare Slots',
  btnBookLessons:       'Stunden buchen',
  btnRemove:            'Entfernen',
  btnSelect:            'Ausw\u00e4hlen',
  sectionMyTeachers:    'Meine Lehrer',
  sectionPending:       'Ausstehende Anfragen',
  pendingLabel:         'Anfrage ausstehend',
  btnCancelRequest:     'Zur\u00fcckziehen',
  emptyMyTeachers:      'Du hast noch keine Lehrer ausgew\u00e4hlt.',
  emptyCtaLabel:        'Zum Lehrerkatalog',
  noTeacherSelected:    'Kein Lehrer ausgew\u00e4hlt',
  noSlotsToday:         'Keine Slots an diesem Tag.',
  calLegendAvail:       'Verf\u00fcgbar',
  calLegendBooked:      'Meine Buchung',
  calWeekdayMo:         'Mo',
  calWeekdayTu:         'Di',
  calWeekdayWe:         'Mi',
  calWeekdayTh:         'Do',
  calWeekdayFr:         'Fr',
  calWeekdaySa:         'Sa',
  calWeekdaySu:         'So',
  monthJan: 'Januar',   monthFeb: 'Februar',  monthMar: 'M\u00e4rz',
  monthApr: 'April',    monthMay: 'Mai',       monthJun: 'Juni',
  monthJul: 'Juli',     monthAug: 'August',    monthSep: 'September',
  monthOct: 'Oktober',  monthNov: 'November',  monthDec: 'Dezember',
  gridHeaderTime:       'Zeit',
  slotAvailable:        'Verf\u00fcgbar',
  slotMyBooking:        'Meine Buchung',
  slotConfirmed:        '\u2713 Best\u00e4tigt',
  slotCancel:           'Stornieren',
  slotBooked:           'Belegt',
  slotPending:          'Vorgemerkt',
  slotPendingCancel:    'Vorgemerkt: Stornieren',
  slotUndo:             'R\u00fckg\u00e4ngig',
  slotBook:             'Buchen',
  fabDismiss:           'Verwerfen',
  fabDone:              'Fertig',
  recurringBook:        '\u21bb\u00a0 Regelm\u00e4\u00dfig buchen',
  modalCancelReqTitle:  'Anfrage zur\u00fcckziehen',
  modalBtnCancel:       'Abbrechen',
  modalBtnConfirm:      'Zur\u00fcckziehen',
  toastSaved:           'Gespeichert.',
  toastDiscarded:       '\u00c4nderungen verworfen.',
  toastNoFreeSlot:      'Kein freier Slot an diesem Tag als Ausgangspunkt verf\u00fcgbar.',
  toastRequestWithdrawn:'{name} \u2014 Anfrage zur\u00fcckgezogen.',
  toastRequestSent:     '{name} \u2014 Anfrage gesendet. Warte auf Best\u00e4tigung.',
  toastTeacherRemoved:  '{name} entfernt.',
  toastConfirmedBooking:'Buchung best\u00e4tigt.',
  toastConfirmError:    'Fehler bei der Best\u00e4tigung: ',
  toastConfirmedSlot:   'Best\u00e4tigte Buchungen k\u00f6nnen nicht storniert werden.'
};

function _stuLoadI18n(cb) {
  var v   = typeof APP_VERSION !== 'undefined' ? ('?v=' + APP_VERSION) : '';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', './locales/student.json' + v);
  xhr.onload = function() {
    try { _stuI18n = JSON.parse(xhr.responseText); } catch(e) { _stuI18n = {}; }
    cb();
  };
  xhr.onerror = function() { _stuI18n = {}; cb(); };
  xhr.send();
}

function _stuT(key) {
  if (_stuI18n && _stuI18n[key]) return _stuI18n[key];
  return _STU_I18N_DEFAULTS[key] || key;
}

/* ── End i18n ─────────────────────────────────────────── */

var currentUser     = null;

/* ── Student display helper: UTC → student local time + offset badge ── */
function _tStudentDisplay(utcTimeStr, dateStr, teacherUid) {
  if (!utcTimeStr) return { localTime: utcTimeStr, endTime: AppService.slotEndTime(utcTimeStr || ''), badgeHTML: '', dayOffsetHTML: '' };
  if (typeof TimezoneService === 'undefined' || !currentUser) {
    return { localTime: utcTimeStr, endTime: AppService.slotEndTime(utcTimeStr), badgeHTML: '', dayOffsetHTML: '' };
  }
  var studentTZ = TimezoneService.getUserTimezone(currentUser.uid);
  var result    = TimezoneService.utcToLocal(utcTimeStr, dateStr || '', studentTZ);
  var localTime = result.localTime;
  var endTime   = AppService.slotEndTime(localTime);
  var badgeHTML = result.offsetLabel !== 'UTC+0'
    ? '<span class="tz-offset-badge">' + result.offsetLabel + '</span>'
    : '';
  var dayOffsetHTML = result.dateOffset !== 0
    ? '<span class="tz-day-offset">' + (result.dateOffset > 0 ? '+1d' : '-1d') + '</span>'
    : '';
  return { localTime: localTime, endTime: endTime, badgeHTML: badgeHTML, dayOffsetHTML: dayOffsetHTML };
}
var activeView      = 'catalog';
var activeTeacherId = null;

var sgridWeekStart  = null;
var _daySlotsFreeOpen = true; /* free slots accordion open state in calendar day view */

var viewYear        = 0;
var viewMonth       = 0;
var selectedDate    = null;

var TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

/* MONTH_NAMES / DAY_NAMES werden nach i18n-Load via _stuApplyI18nArrays() befüllt */
var MONTH_NAMES = ['Januar','Februar','M\u00e4rz','April','Mai','Juni',
                   'Juli','August','September','Oktober','November','Dezember'];
var DAY_NAMES   = ['Mo','Di','Mi','Do','Fr','Sa','So'];

var GRID_START  = '06:00';
var GRID_END    = '22:00';

/* Stored document-level listeners — ermöglicht sauberes removeEventListener */
var _closeTeacherPickerDropdown = null;
var _closeMbTeacherDropdown     = null;
var _pickerMonthBtnsInit        = false;

/* My Bookings — uses shared bookingsFilter + allBookingsSortAsc from teacher.js-compatible globals */
/* bookingsFilter and allBookingsSortAsc are defined here so student.js works standalone */
var bookingsFilter = {
  student:   'all',
  time:      'upcoming',
  confirmed: 'all',
  dateFrom:  '',
  dateTo:    ''
};
var allBookingsSortAsc = true;

/* ── Pending move system (mirrors teacher pendingBookings) ── */
var pendingDayChanges = {};
var _saveSummaryGeneration = 0; /* incremented on every clear to cancel stale async callbacks */
var pendingMoveOpts   = {};   /* teacherId → { reason, reasonLabel, note } from move dialog */
var expandedStudentBlocks = {};  /* blockKey → true, persists open state across re-renders */

function updateDaySaveBtn() {
  var group = document.getElementById('day-save-group');
  if (!group) return;
  /* Summary panel visibility is handled entirely by _renderSaveSummary via is-visible class */
  var pendingBook = Object.keys(pendingDayChanges).filter(function(id) {
    return pendingDayChanges[id].action === 'book';
  });
  var count = Object.keys(pendingDayChanges).length;
  group.classList.toggle('is-visible', count > 0);
  var badge = group.querySelector('.save-badge');
  if (badge) badge.textContent = count;

  /* Build pending slots array for affordability check */
  var pendingSlots = pendingBook.map(function(id) {
    var p = pendingDayChanges[id];
    var s = p.originalSlot;
    var price = parseFloat(s.price) || AppService.getStudentPriceForTeacherSync(currentUser.uid, s.teacherId) || 0;
    return { slotId: id, teacherId: s.teacherId, price: price };
  });

  if (!pendingSlots.length) {
    _renderSaveSummary(null);
    return;
  }

  var _gen = _saveSummaryGeneration;
  AppService.checkPendingAffordability(pendingSlots, currentUser.uid, function(err, result) {
    if (_gen !== _saveSummaryGeneration) return; /* stale callback — pendingDayChanges was cleared */
    if (err) { _renderSaveSummary(null); return; }
    _renderSaveSummary(result, pendingSlots);
  });
}

function _renderSaveSummary(result, pendingSlots) {
  var panel = document.getElementById('day-save-summary');
  if (!panel) return;

  if (!result || !pendingSlots || !pendingSlots.length) {
    panel.innerHTML = '';
    panel.classList.remove('is-visible');
    return;
  }

  var wasCollapsed = panel.classList.contains('is-collapsed');
  /* Determine if there's an error — auto-expand for errors */
  var hasError = result.paymentMode !== 'cash_on_site' && result.totalCost > 0 &&
                 (!result.canAfford || (result.requiresDeposit && !result.depositCovered));
  /* Auto-expand on error; keep previous state otherwise */
  var shouldCollapse = hasError ? false : wasCollapsed;

  panel.classList.add('is-visible');
  panel.innerHTML = '';

  var _hasCur = typeof CurrencyService !== 'undefined' && currentUser;
  var _sCur   = _hasCur ? CurrencyService.getUserCurrency(currentUser.uid) : 'EUR';
  function _fmt(eur) {
    if (!_hasCur || _sCur === 'EUR') return fmtPrice(eur, 'EUR');
    var c = CurrencyService.convertSync(eur, 'EUR', _sCur);
    return c === null ? fmtPrice(eur, 'EUR') : CurrencyService.format(c, _sCur);
  }

  /* ── Collapsible slot lines ── */
  var linesWrap = document.createElement('div');
  linesWrap.className = 'save-summary-lines';
  pendingSlots.forEach(function(ps) {
    var orig = pendingDayChanges[ps.slotId] && pendingDayChanges[ps.slotId].originalSlot;
    if (!orig) return;
    var line = document.createElement('div');
    line.className = 'save-summary-row';
    var t = document.createElement('span'); t.className = 'save-summary-time';
    t.textContent = orig.time + ' \u2013 ' + AppService.slotEndTime(orig.time);
    var p = document.createElement('span'); p.className = 'save-summary-price';
    p.textContent = ps.price > 0 ? _fmt(ps.price) : '';
    line.appendChild(t); line.appendChild(p);
    linesWrap.appendChild(line);
  });
  panel.appendChild(linesWrap);

  /* ── Toggle row: count + total + warning icon (when error) + chevron ── */
  var toggle = document.createElement('div');
  toggle.className = 'save-summary-toggle';
  var tLeft = document.createElement('div');
  tLeft.className = 'save-summary-toggle-left';
  var cntEl = document.createElement('span'); cntEl.className = 'save-summary-toggle-count';
  cntEl.textContent = pendingSlots.length + ' Slot' + (pendingSlots.length !== 1 ? 's' : '');
  var totEl = document.createElement('span'); totEl.className = 'save-summary-toggle-total';
  totEl.textContent = result.totalCost > 0 ? _fmt(result.totalCost) : '';
  tLeft.appendChild(cntEl); tLeft.appendChild(totEl);
  /* Warning badge in toggle when collapsed + error */
  if (hasError) {
    var warnBadge = document.createElement('span');
    warnBadge.textContent = '\u26a0';
    warnBadge.classList.add('warn-badge');
    tLeft.appendChild(warnBadge);
  }
  var chev = document.createElement('span'); chev.className = 'save-summary-toggle-chevron';
  chev.textContent = '\u25b2';
  toggle.appendChild(tLeft); toggle.appendChild(chev);
  panel.appendChild(toggle);

  /* ── Status rows — always visible ── */
  if (result.paymentMode !== 'cash_on_site' && result.totalCost > 0) {
    var walletOk = result.canAfford;
    var wRow = document.createElement('div');
    wRow.className = 'save-summary-warning' + (walletOk ? ' save-summary-ok' : ' save-summary-error');
    wRow.textContent = (walletOk ? '\u2713 ' : '\u26a0 ') +
      'Guthaben: ' + _fmt(result.walletBalance) + (walletOk ? '' : ' \u2014 Nicht genug');
    panel.appendChild(wRow);
    if (result.requiresDeposit) {
      var depOk = result.depositCovered;
      var dRow = document.createElement('div');
      dRow.className = 'save-summary-warning' + (depOk ? ' save-summary-ok' : ' save-summary-warn');
      dRow.textContent = (depOk ? '\u2713 ' : '\u26a0 ') +
        'Deposit: ' + _fmt(result.depositAmount) + (depOk ? ' gedeckt' : ' \u2014 Guthaben zu gering');
      panel.appendChild(dRow);
    }
  }

  /* ── Recurring button — delegates to shared _openRecurringBookingDialog ── */
  var anchorEntry = pendingSlots.length > 0 ? (pendingDayChanges[pendingSlots[0].slotId] || null) : null;
  var anchorSlot  = anchorEntry ? anchorEntry.originalSlot : null;

  if (anchorSlot && !hasError) {
    var recurBtn = document.createElement('button');
    recurBtn.className = 'save-summary-recur-btn';
    recurBtn.innerHTML = _stuT('recurringBook');
    panel.appendChild(recurBtn);

    recurBtn.addEventListener('click', function() {
      /* Build full bundle from all staged book-pending slots */
      var _bundleForSum = [];
      for (var _bsi = 0; _bsi < pendingSlots.length; _bsi++) {
        var _bpe = pendingDayChanges[pendingSlots[_bsi].slotId];
        if (_bpe && _bpe.action === 'book' && _bpe.originalSlot) {
          _bundleForSum.push(_bpe.originalSlot);
        }
      }
      if (!_bundleForSum.length) _bundleForSum = [anchorSlot];

      _openRecurringBookingDialog({
        slot:        anchorSlot,
        bundleSlots: _bundleForSum,
        teacherId:   anchorSlot.teacherId,
        stuId:       currentUser.uid,
        pendingMap:  pendingDayChanges,
        onConfirm:   function() {
          /* Stage the recurring slots then commit everything */
          confirmAndCommit();
        }
      });
    });
  }

  /* Set collapse state */
  if (shouldCollapse) panel.classList.add('is-collapsed');
  else panel.classList.remove('is-collapsed');
  chev.classList.toggle('is-open', !panel.classList.contains('is-collapsed'));

  toggle.addEventListener('click', function() {
    var nowCollapsed = panel.classList.toggle('is-collapsed');
    chev.classList.toggle('is-open', !nowCollapsed);
  });

  /* Disable Save if insufficient funds */
  var saveBtn = document.getElementById('day-save-btn');
  if (saveBtn) {
    var block = result.paymentMode !== 'cash_on_site' && !result.canAfford;
    saveBtn.disabled = block;
    saveBtn.classList.toggle('is-blocked', block);
  }
}

function _refreshNavbarWallet(uid) {
  AppService.getWallet(uid, function(err, wallet) {
    var el = document.getElementById('navbar-wallet-amount');
    if (!el) return;
    el.textContent = err ? '—' : _fmtForUser(parseFloat(wallet.balance), currentUser ? currentUser.uid : null);
  });
}

function confirmAndCommit() {

  var pendingCancel = Object.keys(pendingDayChanges).filter(function(id) {
    return pendingDayChanges[id].action === 'cancel';
  });
  var pendingBook = Object.keys(pendingDayChanges).filter(function(id) {
    return pendingDayChanges[id].action === 'book';
  });

  /* ── Step 1: show policy dialogs sequentially for each staged cancel ── */
  if (pendingCancel.length) {
    var cancelIdx = 0;
    function showNextCancelDialog() {
      if (cancelIdx >= pendingCancel.length) {
        /* All cancel dialogs confirmed — proceed to booking dialog */
        _confirmBookings(pendingBook);
        return;
      }
      var sid = pendingCancel[cancelIdx];
      var p   = pendingDayChanges[sid];
      var slot = p ? p.originalSlot : null;
      if (!slot) { cancelIdx++; showNextCancelDialog(); return; }
      var teacherName = AppService.getDisplayNameSync(slot.teacherId);
      var _csd2 = _tStudentDisplay(slot.time, slot.date, _sdvTeacherId);
      var endTime     = _csd2.endTime;
      AppService.calcCancellationPolicy(sid, 'student', function(err, policy) {
        var policyBody = _buildCancelPolicyBody(policy, teacherName, slot.time, endTime, slot.date);
        var modal = Modal.show({
          title: 'Stornierung bestätigen',
          bodyHTML: policyBody,
          footerHTML:
            '<button class="btn btn-ghost" id="modal-cancel-policy">Nicht stornieren</button>' +
            '<button class="btn btn-danger" id="modal-confirm-policy">Jetzt stornieren</button>'
        });
        document.getElementById('modal-cancel-policy').addEventListener('click', function() {
          /* Remove this cancel from pending and re-stage it as nothing */
          delete pendingDayChanges[sid];
          modal.close();
          updateDaySaveBtn();
          renderDaySlots();
          /* Still process remaining cancels */
          cancelIdx++;
          showNextCancelDialog();
        });
        document.getElementById('modal-confirm-policy').addEventListener('click', function() {
          modal.close();
          cancelIdx++;
          showNextCancelDialog();
        });
      });
    }
    showNextCancelDialog();
    return;
  }

  /* ── Step 2: booking confirmation dialog ─────────────────────── */
  _confirmBookings(pendingBook);
}

function _confirmBookings(pendingBook) {
  if (!pendingBook.length) { commitDayChanges(); return; }

  /* Build cost summary for the dialog */
  var pendingSlots = pendingBook.map(function(id) {
    var p = pendingDayChanges[id];
    var s = p.originalSlot;
    return { slotId: id, teacherId: s.teacherId, price: parseFloat(s.price) || AppService.getStudentPriceForTeacherSync(currentUser.uid, s.teacherId) || 0 };
  });

  var _confirmGen = _saveSummaryGeneration;
  AppService.checkPendingAffordability(pendingSlots, currentUser.uid, function(err, result) {
    if (_confirmGen !== _saveSummaryGeneration) return; /* stale — dismissed before callback fired */
    var totalCost    = result ? result.totalCost    : 0;
    var balance      = result ? result.walletBalance : 0;
    var payMode      = result ? result.paymentMode   : 'instant';
    var reqDeposit   = result ? result.requiresDeposit : false;
    var depositAmt   = result ? result.depositAmount  : 0;
    var balanceAfter = Math.round((balance - (reqDeposit && payMode !== 'cash_on_site' ? depositAmt : 0)) * 100) / 100;

    /* Resolve student display currency for this dialog */
    var _hasCur2 = typeof CurrencyService !== 'undefined' && currentUser;
    var _sCur2   = _hasCur2 ? CurrencyService.getUserCurrency(currentUser.uid) : 'EUR';
    function _fmtD(amountEUR) {
      if (!_hasCur2 || _sCur2 === 'EUR') return fmtPrice(amountEUR, 'EUR');
      var conv = CurrencyService.convertSync(amountEUR, 'EUR', _sCur2);
      if (conv === null) return fmtPrice(amountEUR, 'EUR');
      return CurrencyService.format(conv, _sCur2);
    }

    var rows = pendingSlots.map(function(ps) {
      var orig = pendingDayChanges[ps.slotId] && pendingDayChanges[ps.slotId].originalSlot;
      var timeStr = orig ? (orig.time + ' \u2013 ' + AppService.slotEndTime(orig.time)) : ps.slotId;
      return '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:13px">' +
        '<span style="font-family:monospace">' + timeStr + '</span>' +
        (ps.price > 0 ? '<span style="font-family:monospace;font-weight:600">' + _fmtD(ps.price) + '</span>' : '') +
        '</div>';
    }).join('');

    var paymentLine = '';
    if (payMode === 'cash_on_site') {
      paymentLine = '<div class="payment-status-block payment-status-ok">Bar vor Ort — kein Betrag wird jetzt abgezogen.</div>';
    } else if (reqDeposit && depositAmt > 0) {
      var depOk = balance >= depositAmt;
      paymentLine = '<div class="payment-status-block ' + (depOk ? 'payment-status-ok' : 'payment-status-warn') + '">' +
        (depOk ? '\u2713 ' : '\u26a0 ') + 'Deposit <strong>' + _fmtD(depositAmt) + '</strong> wird von deinem Guthaben abgezogen.<br>' +
        'Guthaben danach: <strong>' + _fmtD(balanceAfter) + '</strong>' +
        '</div>';
    } else if (totalCost > 0) {
      var fullOk = balance >= totalCost;
      paymentLine = '<div class="payment-status-block ' + (fullOk ? 'payment-status-ok' : 'payment-status-warn') + '">' +
        (fullOk ? '\u2713 ' : '\u26a0 ') + 'Gesamtbetrag <strong>' + _fmtD(totalCost) + '</strong> wird abgezogen.<br>' +
        'Guthaben danach: <strong>' + _fmtD(balanceAfter) + '</strong>' +
        '</div>';
    }

    var totalLine = totalCost > 0
      ? '<div class="booking-total-row"><span>Gesamt</span><span>' + _fmtD(totalCost) + '</span></div>'
      : '';

    var bodyHTML = '<div style="font-size:14px">' + rows + totalLine + paymentLine + '</div>';

    /* ── Recurring section (hidden until button pressed) ── */
    var recurHTML = ''; /* inline section removed — ↻ button opens _openRecurringBookingDialog */

    var modal = Modal.show({
      title: pendingBook.length + ' Buchung' + (pendingBook.length !== 1 ? 'en' : '') + ' bestätigen',
      bodyHTML: bodyHTML,
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel-commit">Abbrechen</button>' +
                  '<button class="btn btn-secondary" id="modal-recur-btn">↻  Regelmäßig</button>' +
                  '<button class="btn btn-primary" id="modal-confirm-commit">Jetzt buchen</button>'
    });

    /* ── Wire cancel ── */
    document.getElementById('modal-cancel-commit').addEventListener('click', modal.close);

    /* ── Wire confirm (single booking) ── */
    document.getElementById('modal-confirm-commit').addEventListener('click', function() {
      var btn = document.getElementById('modal-confirm-commit');
      if (btn) btn.disabled = true;
      modal.close();
      commitDayChanges();
    });

    /* ── Wire recurring button → shared _openRecurringBookingDialog ── */
    var _rBtn = document.getElementById('modal-recur-btn');
    var _rAnchorEntry = pendingDayChanges[pendingBook[0]];
    var _rAnchorSlot  = _rAnchorEntry ? _rAnchorEntry.originalSlot : null;
    if (_rBtn) {
      _rBtn.addEventListener('click', function() {
        if (!_rAnchorSlot) return;
        var _rBundle = pendingBook.map(function(id) {
          var pe = pendingDayChanges[id];
          return pe && pe.originalSlot ? pe.originalSlot : null;
        }).filter(Boolean);
        modal.close();
        _openRecurringBookingDialog({
          slot:        _rAnchorSlot,
          bundleSlots: _rBundle.length ? _rBundle : [_rAnchorSlot],
          teacherId:   _rAnchorSlot.teacherId,
          stuId:       currentUser.uid,
          pendingMap:  pendingDayChanges,
          onConfirm:   function() { commitDayChanges(); }
        });
      });
    }
  });
}

function commitDayChanges() {
  var ids   = Object.keys(pendingDayChanges);
  var saved = {};

  /* ── Callback barrier ───────────────────────────────────────────
     All async ops fire in parallel. pending counts down to zero.
     onAllDone() fires exactly once when every callback has returned,
     then does a single authoritative re-render + wallet refresh.
  ──────────────────────────────────────────────────────────────── */
  var pending = ids.length;
  var errors  = [];

  function onAllDone() {
    /* Detect move pairs: a cancel + book for the same teacher on the same day = reschedule */
    var cancelMap = {};
    var bookMap   = {};
    var sids = Object.keys(saved);
    for (var mi = 0; mi < sids.length; mi++) {
      var mp = saved[sids[mi]];
      if (!mp.originalSlot) continue;
      var tid = mp.originalSlot.teacherId;
      if (mp.action === 'cancel') cancelMap[tid] = mp.originalSlot;
      else if (mp.action === 'book') bookMap[tid]  = mp.originalSlot;
    }
    Object.keys(cancelMap).forEach(function(tid) {
      if (bookMap[tid]) {
        /* Gather move opts stored by the dialog */
        var moveOpts = (pendingMoveOpts && pendingMoveOpts[tid]) ? pendingMoveOpts[tid] : {};
        var oldSlot  = cancelMap[tid];
        var newSlot  = bookMap[tid];
        AppService.writeMoveRecord(oldSlot, newSlot, currentUser.uid, 'student', function(err, result) {
          if (err) return;
          /* Notifications now fired by AppService.writeMoveRecord */
        }, moveOpts);
      }
    });

    /* Write ONE block booking TX per (teacher, date) group */
    var blockGroups = {};
    var sids2 = Object.keys(saved);
    for (var bi = 0; bi < sids2.length; bi++) {
      var bp = saved[sids2[bi]];
      if (bp.action !== 'book') continue;
      var bSlot = AppService.getAllSlotsSync().filter(function(s) { return s.slotId === sids2[bi]; })[0];
      if (!bSlot) continue;
      var bKey = currentUser.uid + '_' + (bSlot.teacherId || '') + '_' + (bSlot.date || '');
      if (!blockGroups[bKey]) blockGroups[bKey] = { slots: [], escrows: [], stuId: currentUser.uid, tid: bSlot.teacherId };
      blockGroups[bKey].slots.push(bSlot);
    }
    Object.keys(blockGroups).forEach(function(gKey) {
      var g = blockGroups[gKey];
      if (!g.slots.length) return;
      g.slots.sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
      AppService.getEscrowsByStudent(g.stuId, function(err, allEsc) {
        if (!err && allEsc) {
          g.slots.forEach(function(sl) {
            for (var ei = 0; ei < allEsc.length; ei++) {
              if (allEsc[ei].slotId === sl.slotId) { g.escrows.push(allEsc[ei]); break; }
            }
          });
        }
        AppService.writeBlockBookingRecord(g.slots, g.escrows, 'student', function() {});
        AppService.writeBlockEscrowHold(g.slots, g.escrows, function() {});
      });
    });

    pendingDayChanges = {};
    _saveSummaryGeneration++;
    updateDaySaveBtn();
    renderStats();
    _updateMyBookingsBadges();
    renderMyBookingsList();
    renderCalendar();
    renderDaySlots();
    _refreshNavbarWallet(currentUser.uid);
    if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(currentUser.uid);
    if (errors.length) {
      Toast.error(errors[0]);
    } else {
      Toast.success(_stuT('toastSaved'));
    }
  }

  if (!pending) { onAllDone(); return; }

  for (var i = 0; i < ids.length; i++) {
    var p = pendingDayChanges[ids[i]];
    saved[ids[i]] = p;
    if (p.action === 'book') {
      (function(sid, stuId, tid) {
        AppService.bookSlotWithEscrowSilent(sid, stuId, tid, function(e) {
          if (e) errors.push(e.message || e);
          if (--pending === 0) onAllDone();
        }, 'student');
      })(ids[i], p.newStudentId || currentUser.uid, p.originalSlot.teacherId);
    } else {
      (function(sid) {
        AppService.cancelSlotWithPolicy(sid, 'student', function(e) {
          if (e) errors.push(e.message || e);
          if (--pending === 0) onAllDone();
        });
      })(ids[i]);
    }
  }

  /* Email + Chat notifications — group booked slots by (teacher, date) for ONE block message */
  var emailIds = Object.keys(saved);
  var bookGroups = {}; /* key: teacherId_date → { teacher, dateLabel, slots[] } */

  for (var ei = 0; ei < emailIds.length; ei++) {
    var ep  = saved[emailIds[ei]];
    var es  = ep.originalSlot;
    if (!es) continue;
    var teacher = AppService.getUserSync(es.teacherId);
    if (!teacher) continue;
    var dateObj   = new Date(es.date + 'T00:00:00');
    var dateLabel = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    var endTime   = AppService.slotEndTime(es.time);
    if (ep.action === 'book') {
      /* EmailService.onBookingCreated now fired by AppService.bookSlotWithEscrowSilent */
      /* Collect for block chat message */
      var gKey = es.teacherId + '_' + es.date;
      if (!bookGroups[gKey]) bookGroups[gKey] = { teacher: teacher, dateLabel: dateLabel, slots: [] };
      var _sd4 = _tStudentDisplay(es.time, es.date, es.teacherId);
      bookGroups[gKey].slots.push({ time: _sd4.localTime, endTime: _sd4.endTime });
    } else {
      /* EmailService.onBookingCancelled now fired by AppService.cancelSlotWithPolicy */
    }
  }

  /* Send ONE structured booking_notification per partner (all dates batched) */
  if (typeof ChatStore !== 'undefined') {
    var notifGroups = {}; /* key: teacherId → { teacher, slots[] } */
    for (var ni = 0; ni < emailIds.length; ni++) {
      var np  = saved[emailIds[ni]];
      var ns  = np.originalSlot;
      if (!ns || np.action !== 'book') continue;
      var nTeacher = AppService.getUserSync(ns.teacherId);
      if (!nTeacher) continue;
      var nKey = ns.teacherId;
      if (!notifGroups[nKey]) notifGroups[nKey] = { teacher: nTeacher, slotsByDate: {} };
      var nDate = ns.date;
      if (!notifGroups[nKey].slotsByDate[nDate]) {
        notifGroups[nKey].slotsByDate[nDate] = { date: nDate, slots: [] };
      }
      notifGroups[nKey].slotsByDate[nDate].slots.push({
        slotId:  ns.slotId,
        time:    ns.time,
        endTime: AppService.slotEndTime(ns.time)
      });
    }
    Object.keys(notifGroups).forEach(function(tKey) {
      var ng          = notifGroups[tKey];
      var pricePerSlot = AppService.getStudentPriceForTeacherSync(currentUser.uid, tKey);
      var blocks      = [];
      var allSlotIds  = [];
      var totalSlots  = 0;
      Object.keys(ng.slotsByDate).sort().forEach(function(dKey) {
        var dg = ng.slotsByDate[dKey];
        dg.slots.sort(function(a, b) { return a.time.localeCompare(b.time); });
        var bStart   = dg.slots[0].time;
        var bEnd     = dg.slots[dg.slots.length - 1].endTime;
        var cnt      = dg.slots.length;
        var dateObj  = new Date(dKey + 'T00:00:00');
        var dLabel   = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        var bSlotIds = dg.slots.map(function(s) { return s.slotId; });
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
        actorId:     currentUser.uid,
        actorRole:   'student',
        teacherId:   tKey,
        teacherName: AppService.getDisplayNameSync(tKey),
        studentId:   currentUser.uid,
        studentName: AppService.getDisplayNameSync(currentUser.uid),
        currency:    'EUR',
        pricePerSlot: pricePerSlot,
        totalSlots:  totalSlots,
        totalAmount: pricePerSlot * totalSlots,
        blocks:      blocks,
        allSlotIds:  allSlotIds
      };
      ChatStore.sendBookingNotification(currentUser.uid, tKey, snapshot);
    });
  }
}

function discardDayChanges() { discardAllPending(); }  /* legacy alias */

function discardAllPending() {
  pendingDayChanges = {};
  _sdvPending = {};
  _saveSummaryGeneration++; /* cancel any in-flight affordability callbacks */

  updateDaySaveBtn();
  if (_sdvOpen) {
    _sdvRenderSlots();
  } else {
    renderDaySlots();
    renderMyBookingsList();
  }
  Toast.info(_stuT('toastDiscarded'));
}



/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
window.addEventListener('load', function() {
  currentUser = Auth.require('student');
  if (!currentUser) return;

  _stuLoadI18n(function() {

  /* Warm up CurrencyService rate cache BEFORE first render so convertSync()
     returns correct values immediately. Falls back gracefully if unavailable. */
  function _initApp() {
    Navbar.init('catalog');

    /* ── i18n: set all static HTML text via _stuT() ── */
    (function() {
      var els = {
        'student-page-title':   _stuT('pageTitle'),
        'student-page-subtitle':_stuT('pageSubtitle'),
        'stat-label-teachers':  _stuT('statMyTeachers'),
        'stat-label-bookings':  _stuT('statBooked'),
        'nav-catalog':          _stuT('tabMyTeachers'),
        'nav-calendar':         _stuT('tabBookLesson'),
        'nav-my-bookings':      _stuT('tabMyBookings'),
        'nav-wallet':           _stuT('tabWallet'),
        'nav-dashboard-link':   _stuT('tabDashboard'),
        'cal-legend-avail':     _stuT('calLegendAvail'),
        'cal-legend-booked':    _stuT('calLegendBooked'),
        'fab-dismiss-label':    _stuT('fabDismiss'),
        'fab-done-label':       _stuT('fabDone')
      };
      for (var id in els) {
        var el = document.getElementById(id);
        if (el) el.textContent = els[id];
      }
    }());

    document.getElementById('nav-catalog').addEventListener('click', function() { switchView('catalog'); });
    document.getElementById('nav-calendar').addEventListener('click', function() { switchView('calendar'); });
    document.getElementById('nav-my-bookings').addEventListener('click', function() { switchView('my-bookings'); });
    document.getElementById('nav-wallet').addEventListener('click', function() { switchView('wallet'); });
    var dashLink = document.getElementById('nav-dashboard-link');
    if (dashLink && currentUser) { dashLink.href = './dashboard.html?uid=' + encodeURIComponent(currentUser.uid); }
    document.getElementById('sgrid-close-btn').addEventListener('click', closeStudentGrid);
    document.getElementById('sgrid-prev-month').addEventListener('click', sgridPrevMonth);
    document.getElementById('sgrid-prev-week').addEventListener('click', sgridPrevWeek);
    document.getElementById('sgrid-next-week').addEventListener('click', sgridNextWeek);
    document.getElementById('sgrid-next-month').addEventListener('click', sgridNextMonth);

    /* Student Day View overlay */
    _sdvInitListeners();

    /* Day-nav-bar buttons — same as teacher.js */
    document.getElementById('day-nav-prev').addEventListener('click', function() { navDay(-1); });
    document.getElementById('day-nav-next').addEventListener('click', function() { navDay(1); });
    document.getElementById('day-nav-prev-month').addEventListener('click', function() { navMonth(-1); });
    document.getElementById('day-nav-next-month').addEventListener('click', function() { navMonth(1); });

    /* day-save + day-dismiss buttons — shared between day-slots and student day view */
    var _saveBtnEl = document.getElementById('day-save-btn');
    if (_saveBtnEl) _saveBtnEl.addEventListener('click', function() {
      if (_sdvOpen) { _sdvSavePending(); } else { confirmAndCommit(); }
    });
    var _dismissBtnEl = document.getElementById('day-dismiss-btn');
    if (_dismissBtnEl) _dismissBtnEl.addEventListener('click', discardAllPending);

    /* Recurring booking toolbar button */
    var _recurOpenBtn = document.getElementById('day-recur-open-btn');
    if (_recurOpenBtn) {
      _recurOpenBtn.addEventListener('click', function() {
        if (!activeTeacherId || !selectedDate || !currentUser) return;
        var dateStr = fmtDate(selectedDate);
        var daySlots = AppService.getSlotsByTeacherDateSync(activeTeacherId, dateStr)
          .sort(function(a, b) { return a.time.localeCompare(b.time); });
        /* Find first free slot on this day as anchor */
        var freeSlot = null;
        for (var fi = 0; fi < daySlots.length; fi++) {
          if (daySlots[fi].status === 'available' || daySlots[fi].status === 'recurring') {
            freeSlot = daySlots[fi]; break;
          }
        }
        if (!freeSlot) {
          Toast.info(_stuT('toastNoFreeSlot'));
          return;
        }
        /* Build bundle from all currently staged book-pending slots on this day */
        var _bundleSlots4 = [];
        var _pdKeys4 = Object.keys(pendingDayChanges);
        for (var _bk4 = 0; _bk4 < _pdKeys4.length; _bk4++) {
          var _pe4 = pendingDayChanges[_pdKeys4[_bk4]];
          if (_pe4 && _pe4.action === 'book' && _pe4.originalSlot &&
              _pe4.originalSlot.date === fmtDate(selectedDate)) {
            _bundleSlots4.push(_pe4.originalSlot);
          }
        }
        if (!_bundleSlots4.length) _bundleSlots4 = [freeSlot];
        _openRecurringBookingDialog({
          slot:        freeSlot,
          bundleSlots: _bundleSlots4,
          teacherId:   activeTeacherId,
          stuId:       currentUser.uid,
          pendingMap:  pendingDayChanges,
          onConfirm:   function() {
            updateDaySaveBtn();
            _updateMyBookingsBadges();
            renderMyBookingsList();
            renderStudentGrid();
          }
        });
      });
    }

    var now   = new Date();
    viewYear  = now.getFullYear();
    viewMonth = now.getMonth();

    renderStats();
    switchView('catalog');
  }

  if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
    CurrencyService.onReady(_initApp);
  } else {
    _initApp();
  }
  }); /* end _stuLoadI18n */
});

/* ── View switcher ──────────────────────────────────────── */
function switchView(view) {
  activeView = view;
  document.getElementById('nav-catalog').classList.toggle('active', view === 'catalog');
  document.getElementById('nav-calendar').classList.toggle('active', view === 'calendar');
  document.getElementById('nav-my-bookings').classList.toggle('active', view === 'my-bookings');
  document.getElementById('nav-wallet').classList.toggle('active', view === 'wallet');
  document.getElementById('view-catalog').classList.toggle('view-hidden', view !== 'catalog');
  document.getElementById('view-calendar').classList.toggle('view-hidden', view !== 'calendar');
  document.getElementById('view-my-bookings').classList.toggle('view-hidden', view !== 'my-bookings');
  document.getElementById('view-wallet').classList.toggle('view-hidden', view !== 'wallet');
  if (view === 'catalog')     renderCatalog();
  if (view === 'calendar')    { renderTeacherPicker(); setTimeout(updateJumpBtns, 100); }
  if (view === 'my-bookings') { renderMyBookings(); setTimeout(updateJumpBtns, 200); }
  if (view === 'wallet' && typeof WalletPanel !== 'undefined') {
    WalletPanel.mount('student-wallet-panel', currentUser.uid);
  }
}

/* ── Stats ──────────────────────────────────────────────── */
function renderStats() {
  var selections   = AppService.getSelectionsByStudentSync(currentUser.uid);
  var allTeachers  = AppService.getUsersByRoleSync('teacher');
  var selectedIds  = selections.map(function(s) { return s.teacherId; });
  /* Count pending requests (sent but not yet confirmed) */
  var pendingCount = allTeachers.filter(function(t) {
    if (selectedIds.indexOf(t.uid) !== -1) return false;
    var status = ChatStore.getRequestStatus(t.uid, currentUser.uid);
    return status === 'pending';
  }).length;
  var bookings = AppService.getSlotsByStudentSync(currentUser.uid)
    .filter(function(s) { return s.status === 'booked'; });

  var teacherEl = document.getElementById('stat-teachers');
  if (teacherEl) {
    teacherEl.textContent = selections.length;
    /* Show pending badge if any */
    var existingBadge = teacherEl.parentNode.querySelector('.stat-pending-badge');
    if (existingBadge) existingBadge.parentNode.removeChild(existingBadge);
    if (pendingCount > 0) {
      var badge = document.createElement('div');
      badge.className = 'stat-pending-badge';
      badge.textContent = pendingCount + ' ausstehend';
      teacherEl.parentNode.appendChild(badge);
    }
  }
  var bookEl = document.getElementById('stat-bookings');
  if (bookEl) bookEl.textContent = bookings.length;
}

/* ══════════════════════════════════════════════════════════
   CATALOG
══════════════════════════════════════════════════════════ */
function renderCatalog() {
  var allTeachers  = AppService.getUsersByRoleSync('teacher');
  var mySelections = AppService.getSelectionsByStudentSync(currentUser.uid).map(function(s) { return s.teacherId; });

  /* Confirmed teachers = in Selections */
  var confirmedTeachers = allTeachers.filter(function(t) {
    return mySelections.indexOf(t.uid) !== -1;
  });

  /* Pending teachers = student_request sent but not yet in Selections */
  var pendingTeachers = allTeachers.filter(function(t) {
    if (mySelections.indexOf(t.uid) !== -1) return false; /* already confirmed */
    var status = ChatStore.getRequestStatus(t.uid, currentUser.uid);
    return status === 'pending';
  });

  var container = document.getElementById('catalog-grid');
  container.innerHTML = '';

  /* ── Teacher search combo — mockup-renderCatalog-searchDropdown-2026-03-24_11-44 ── */
  if (typeof buildTeacherSearchCombo !== 'undefined') {
    var _searchTeachers = allTeachers.map(function(t) {
      var prof = AppService.getProfileSync(t.uid);
      var avail = AppService.getSlotsByTeacherSync(t.uid)
        .filter(function(s) { return s.status === 'available'; }).length;
      return {
        uid:        t.uid,
        name:       AppService.getDisplayNameSync(t.uid) || t.uid,
        discipline: t.discipline || '',
        price:      prof ? prof.pricePerHalfHour : '',
        photo:      ProfileStore.getPhoto(t.uid),
        availCount: avail
      };
    });
    var searchCombo = buildTeacherSearchCombo(
      'catalog-teacher-search',
      'Lehrer suchen…',
      _searchTeachers,
      function(uid) {
        /* Highlight selected, dim others */
        var cards = container.querySelectorAll('.teacher-card');
        for (var _hi = 0; _hi < cards.length; _hi++) {
          var cardUid = cards[_hi].getAttribute('data-uid') ||
            (cards[_hi].querySelector('[data-uid]') || {}).getAttribute ? null : null;
          /* Find card by name match */
          var nameEl = cards[_hi].querySelector('.teacher-card-name');
          var isMatch = uid && nameEl && (function() {
            /* Walk up to find data-uid on card */
            var el = cards[_hi];
            return el.getAttribute('data-uid') === uid ||
              el.querySelector('[data-connect-uid="' + uid + '"]') !== null;
          })();
          cards[_hi].classList.toggle('catalog-search-highlight', !!uid && isMatch);
          cards[_hi].classList.toggle('catalog-search-dim', !!uid && !isMatch);
        }
        /* Scroll to matched card */
        if (uid) {
          var matchCard = container.querySelector('[data-connect-uid="' + uid + '"]');
          if (matchCard) {
            matchCard = matchCard.closest('.teacher-card') || matchCard;
            matchCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      },
      'catalog-grid'
    );
    container.appendChild(searchCombo);
  }

  if (!confirmedTeachers.length && !pendingTeachers.length) {
    var emptyWrap = document.createElement('div');
    emptyWrap.className = 'catalog-empty text-muted';
    var emptyMsg = document.createElement('p');
    emptyMsg.textContent = _stuT('emptyMyTeachers');
    emptyWrap.appendChild(emptyMsg);
    var ctaBtn = document.createElement('a');
    ctaBtn.className = 'btn btn-primary';
    ctaBtn.href      = './skiing-catalog.html?uid=' + encodeURIComponent(currentUser.uid);
    ctaBtn.textContent = _stuT('emptyCtaLabel');
    emptyWrap.appendChild(ctaBtn);
    container.appendChild(emptyWrap);
    return;
  }

  /* ── Confirmed section ── */
  if (confirmedTeachers.length) {
    var confirmedHeader = document.createElement('div');
    confirmedHeader.className = 'teacher-section-header';
    confirmedHeader.innerHTML =
      '<span class="teacher-section-label">' + _stuT('sectionMyTeachers') + '</span>' +
      '<span class="teacher-section-count">' + confirmedTeachers.length + '</span>';
    container.appendChild(confirmedHeader);

    for (var i = 0; i < confirmedTeachers.length; i++) {
      container.appendChild(buildTeacherCard(confirmedTeachers[i], mySelections, 'accepted'));
    }
  }

  /* ── Pending section ── */
  if (pendingTeachers.length) {
    var pendingHeader = document.createElement('div');
    pendingHeader.className = 'teacher-section-header teacher-section-header--pending';
    pendingHeader.innerHTML =
      '<span class="teacher-section-label">' + _stuT('sectionPending') + '</span>' +
      '<span class="teacher-section-count teacher-section-count--pending">' + pendingTeachers.length + '</span>';
    container.appendChild(pendingHeader);

    for (var j = 0; j < pendingTeachers.length; j++) {
      container.appendChild(buildTeacherCard(pendingTeachers[j], mySelections, 'pending'));
    }
  }

  /* search wired via buildTeacherSearchCombo above */
}

function buildTeacherCard(teacher, mySelections, reqStatus) {
  var isSelected = mySelections.indexOf(teacher.uid) !== -1;
  var isPending  = !isSelected && reqStatus === 'pending';
  var availCount = AppService.getSlotsByTeacherSync(teacher.uid).filter(function(s) { return s.status === 'available'; }).length;

  var card = document.createElement('div');
  card.className = 'card teacher-card' + (isSelected ? ' teacher-card-selected' : '') + (isPending ? ' teacher-card-pending' : '');

  var top = document.createElement('div');
  top.className = 'teacher-card-top';

  /* Avatar */
  var avatarEl = document.createElement('div');
  avatarEl.className = 'teacher-card-avatar';
  avatarEl.innerHTML = buildAvatarHTML(teacher.uid, { size: 'md', role: 'teacher' });
  top.appendChild(avatarEl);

  var nameWrap = document.createElement('div');
  nameWrap.className = 'teacher-card-name-wrap';
  var name = document.createElement('div');
  name.className = 'teacher-card-name';
  name.textContent = AppService.getDisplayNameSync(teacher.uid);

  /* Discipline badge */
  var discLabels = { ski: 'Ski', snowboard: 'Snowboard', telemark: 'Telemark', nordic: 'Langlauf' };
  if (teacher.discipline && discLabels[teacher.discipline]) {
    var discBadge = document.createElement('span');
    discBadge.className = 'teacher-card-discipline';
    discBadge.textContent = discLabels[teacher.discipline];
    nameWrap.appendChild(name);
    nameWrap.appendChild(discBadge);
  } else {
    nameWrap.appendChild(name);
  }

  /* Price — individual price has priority over standard price */
  var _stdPrice = AppService.getTeacherPriceSync(teacher.uid) || 0;
  var price = (currentUser && typeof AppService.getStudentPriceForTeacherSync === 'function')
    ? AppService.getStudentPriceForTeacherSync(currentUser.uid, teacher.uid)
    : _stdPrice;
  var _hasIndividualPrice = currentUser && price !== _stdPrice;
  if (price) {
    var priceEl = document.createElement('div');
    var teacherProf = AppService.getProfileSync(teacher.uid);
    var tCur = (teacherProf && teacherProf.priceCurrency) ? teacherProf.priceCurrency : 'EUR';
    var priceText = '';
    if (typeof CurrencyService !== 'undefined') {
      var priceFormatted = CurrencyService.format(parseFloat(price), tCur);
      var sCur = (typeof currentUser !== 'undefined' && currentUser)
        ? CurrencyService.getUserCurrency(currentUser.uid) : 'EUR';
      if (sCur !== tCur) {
        var converted = CurrencyService.convertSync(parseFloat(price), tCur, sCur);
        priceText = converted !== null
          ? priceFormatted + ' \u2248 ' + CurrencyService.format(converted, sCur) + ' / 30 min'
          : priceFormatted + ' / 30 min';
      } else {
        priceText = priceFormatted + ' / 30 min';
      }
    } else {
      priceText = fmtPrice(parseFloat(price), 'EUR') + ' / 30 min';
    }
    if (_hasIndividualPrice) {
      priceEl.className = 'teacher-card-price-individual';
      priceEl.innerHTML = _esc(priceText) + ' <span class="price-individual-badge">Ihr Preis</span>';
    } else {
      priceEl.className = 'teacher-card-price';
      priceEl.textContent = priceText;
    }
    nameWrap.appendChild(priceEl);
  }

  top.appendChild(nameWrap);

  if (isSelected) {
    var badge = document.createElement('span');
    badge.className = 'teacher-selected-badge';
    badge.textContent = _stuT('cardSelected');
    top.appendChild(badge);
  }

  var avail = document.createElement('div');
  avail.className = 'teacher-card-avail text-muted';
  avail.textContent = availCount + ' ' + (availCount !== 1 ? _stuT('cardAvailSlotsPlural') : _stuT('cardAvailSlots'));

  var actions = document.createElement('div');
  actions.className = 'teacher-card-actions';

  if (isSelected) {
    var viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-secondary btn-sm';
    viewBtn.textContent = _stuT('btnBookLessons');
    (function(tid) { viewBtn.addEventListener('click', function(e) { e.stopPropagation(); openTeacherGrid(tid); }); })(teacher.uid);

    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-ghost btn-sm';
    removeBtn.textContent = _stuT('btnRemove');
    (function(tid) { removeBtn.addEventListener('click', function(e) { e.stopPropagation(); deselectTeacher(tid); }); })(teacher.uid);

    actions.appendChild(viewBtn);
    actions.appendChild(removeBtn);
  } else if (isPending) {
    var pendingLbl = document.createElement('span');
    pendingLbl.className = 'teacher-card-pending-label';
    pendingLbl.textContent = _stuT('pendingLabel');
    actions.appendChild(pendingLbl);

    var cancelReqBtn = document.createElement('button');
    cancelReqBtn.className = 'btn btn-ghost btn-sm';
    cancelReqBtn.textContent = _stuT('btnCancelRequest');
    (function(tid) {
      cancelReqBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        Modal.show({
          title: _stuT('modalCancelReqTitle'),
          bodyHTML: '<p>Möchtest du die Anfrage an <strong>' +
            AppService.getDisplayNameSync(tid).replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</strong> zurückziehen?</p>',
          footerHTML: '<button class="btn btn-ghost" id="modal-cancel">' + _stuT('modalBtnCancel') + '</button>' +
            '<button class="btn btn-danger" id="modal-confirm">' + _stuT('modalBtnConfirm') + '</button>'
        });
        document.getElementById('modal-cancel').addEventListener('click', function() {
          Modal.show.__lastInstance && Modal.show.__lastInstance.close
            ? Modal.show.__lastInstance.close()
            : document.querySelector('.modal-overlay') && document.querySelector('.modal-overlay').remove();
        });
        document.getElementById('modal-confirm').addEventListener('click', function() {
          document.querySelector('.modal-overlay') && document.querySelector('.modal-overlay').remove();
          Toast.info(_stuT('toastRequestWithdrawn').replace('{name}', AppService.getDisplayNameSync(tid)));
          renderCatalog();
        });
      });
    })(teacher.uid);
    actions.appendChild(cancelReqBtn);
  } else {
    var selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-primary btn-sm';
    selectBtn.textContent = _stuT('btnSelect');
    (function(tid) { selectBtn.addEventListener('click', function(e) { e.stopPropagation(); selectTeacher(tid); }); })(teacher.uid);
    actions.appendChild(selectBtn);
  }

  card.appendChild(top);
  card.appendChild(avail);
  card.appendChild(actions);

  /* Click on card (not on buttons) → open full teacher profile */
  card.classList.add('is-clickable');
  (function(tid) {
    var viewer = (typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().uid : '';
    card.addEventListener('click', function() {
      window.location.href = './profile-view.html?uid=' + encodeURIComponent(tid) +
        '&viewer=' + encodeURIComponent(viewer);
    });
  })(teacher.uid);

  return card;
}

function selectTeacher(teacherId) {
  var teacherName = AppService.getDisplayNameSync(teacherId);
  var studentName = AppService.getDisplayNameSync(currentUser.uid);
  /* Send service request via chat — selection only created after teacher accepts */
  ChatStore.sendServiceMessage(teacherId, currentUser.uid, 'student_request');
  /* EmailService.onRequestReceived — TODO: move to AppService.createSelection side-effect */
  if (typeof EmailService !== 'undefined' && EmailService.onRequestReceived) {
    EmailService.onRequestReceived(teacherId, studentName);
  }
  Toast.info(_stuT('toastRequestSent').replace('{name}', teacherName));
  renderCatalog();
}

function deselectTeacher(teacherId) {
  AppService.deleteSelection(currentUser.uid, teacherId, function(e){if(e)Toast.error(e.message||e);});
  Toast.success(_stuT('toastTeacherRemoved').replace('{name}', AppService.getDisplayNameSync(teacherId)));
  renderStats();
  renderCatalog();
}

function openTeacherGrid(teacherId) {
  activeTeacherId = teacherId;
  /* Pre-select today so day panel loads immediately on calendar open */
  var now = new Date();
  now.setHours(0, 0, 0, 0);
  selectedDate = now;
  switchView('calendar');
}

/* ══════════════════════════════════════════════════════════
   TEACHER PICKER (calendar view top)
══════════════════════════════════════════════════════════ */
function renderTeacherPicker() {
  var myTeachers = AppService.getSelectionsByStudentSync(currentUser.uid)
    .map(function(s) { return AppService.getUserSync(s.teacherId); })
    .filter(function(t) { return t !== null; });

  var calSection = document.getElementById('cal-section');
  var list    = document.getElementById('teacher-picker-list');
  var label   = document.getElementById('teacher-picker-label');
  var trigger = document.getElementById('teacher-picker-trigger');
  var weekBtn = document.getElementById('teacher-picker-week-btn');

  if (!myTeachers.length) {
    if (list)    list.innerHTML = '';
    if (label)   label.textContent = _stuT('noTeacherSelected');
    if (weekBtn) weekBtn.disabled = true;
    calSection.classList.add('view-hidden');
    return;
  }

  if (!activeTeacherId) activeTeacherId = myTeachers[0].uid;

  /* ── Build options list ── */
  var options = [];
  for (var i = 0; i < myTeachers.length; i++) {
    options.push({ value: myTeachers[i].uid, text: AppService.getDisplayNameSync(myTeachers[i].uid) });
  }

  function setTeacher(val) {
    activeTeacherId = val;
    var selected = null;
    for (var j = 0; j < options.length; j++) {
      if (options[j].value === val) { selected = options[j]; break; }
    }
    label.textContent = selected ? selected.text : options[0].text;
    var items = list.querySelectorAll('.custom-dropdown-item');
    for (var k = 0; k < items.length; k++) {
      var isActive = items[k].getAttribute('data-value') === val;
      items[k].classList.toggle('is-active', isActive);
      items[k].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    closeDropdown();
    renderCalendar();
    renderDaySlots();
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

  /* ── Rebuild list items ── */
  list.innerHTML = '';
  for (var m = 0; m < options.length; m++) {
    (function(opt) {
      var li = document.createElement('li');
      li.className = 'custom-dropdown-item' + (opt.value === activeTeacherId ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', opt.value);
      li.setAttribute('aria-selected', opt.value === activeTeacherId ? 'true' : 'false');
      li.textContent = opt.text;
      li.addEventListener('click', function() { setTeacher(opt.value); });
      list.appendChild(li);
    })(options[m]);
  }

  /* ── Sync label to current selection ── */
  var curOpt = null;
  for (var n = 0; n < options.length; n++) {
    if (options[n].value === activeTeacherId) { curOpt = options[n]; break; }
  }
  label.textContent = curOpt ? curOpt.text : options[0].text;

  /* ── Toggle open/close — onclick überschreibt statt zu stapeln ── */
  trigger.onclick = function(e) {
    e.stopPropagation();
    if (list.classList.contains('is-open')) { closeDropdown(); } else { openDropdown(); }
  };

  /* ── Close on outside click — alten Listener zuerst entfernen ── */
  if (_closeTeacherPickerDropdown) {
    document.removeEventListener('click', _closeTeacherPickerDropdown);
  }
  _closeTeacherPickerDropdown = function() { closeDropdown(); };
  document.addEventListener('click', _closeTeacherPickerDropdown);

  /* ── Wochenansicht-Button — onclick überschreibt ── */
  weekBtn.disabled = false;
  weekBtn.onclick  = openStudentGrid;

  /* ── Prev/Next-Monat — einmalig binden ── */
  if (!_pickerMonthBtnsInit) {
    _pickerMonthBtnsInit = true;
    document.getElementById('prev-btn').addEventListener('click', prevMonth);
    document.getElementById('next-btn').addEventListener('click', nextMonth);
  }

  /* Pre-select today if no date selected yet */
  if (!selectedDate) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    selectedDate = now;
  }

  calSection.classList.remove('view-hidden');
  renderCalendar();
  renderDaySlots();
}

/* Materialise recurring slots for all weeks visible in the current month view.
   Mirrors teacher's materialiseVisibleMonth — uses activeTeacherId instead of currentUser.uid */
function materialiseVisibleMonth(year, month) {
  if (!activeTeacherId) return;
  var first    = new Date(year, month, 1);
  var startDow = first.getDay(); startDow = (startDow === 0) ? 6 : startDow - 1;
  var gridStart = new Date(year, month, 1 - startDow);
  var seen = {};
  for (var d = 0; d < 42; d++) {
    var day = new Date(gridStart);
    day.setDate(gridStart.getDate() + d);
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
    AppService.materialiseWeek(activeTeacherId, weekDates, function(e) {
      if (e) Toast.error(e.message || e);
    });
  }
}

/* ══════════════════════════════════════════════════════════
   STUDENT WEEK GRID OVERLAY
══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   MONTH CALENDAR
══════════════════════════════════════════════════════════ */
function renderCalendar() {
  var calSection = document.getElementById('cal-section');
  if (!calSection) return;

  /* Materialise recurring slots for all visible weeks — same as teacher */
  materialiseVisibleMonth(viewYear, viewMonth);

  document.getElementById('month-label').textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;
  var grid = document.getElementById('cal-days');
  grid.innerHTML = '';

  /* Normalize TODAY to midnight for correct past/today comparison */
  var todayMidnight = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  var first    = new Date(viewYear, viewMonth, 1);
  var startDow = first.getDay();
  startDow     = (startDow === 0) ? 6 : startDow - 1;
  var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  var prevDays    = new Date(viewYear, viewMonth, 0).getDate();

  for (var i = startDow - 1; i >= 0; i--) {
    grid.appendChild(makeDayCell(prevDays - i, true));
  }
  for (var d = 1; d <= daysInMonth; d++) {
    (function(day) {
      var date    = new Date(viewYear, viewMonth, day);
      var isPast  = date < todayMidnight;
      var isToday = date.getTime() === todayMidnight.getTime();
      var isSel   = selectedDate && date.getTime() === selectedDate.getTime();
      var dateStr = fmtDate(date);
      var slots   = activeTeacherId ? AppService.getSlotsByTeacherDateSync(activeTeacherId, dateStr) : [];
      var hasAvail  = !isPast && slots.some(function(s) { return s.status === 'available' || s.status === 'recurring'; });
      var hasMyBook = slots.some(function(s) { return s.status === 'booked' && s.studentId === currentUser.uid; });

      var cell = makeDayCell(day, false, isToday, isSel, hasAvail, hasMyBook);
      if (!isPast) {
        cell.setAttribute('tabindex', '0');
        cell.addEventListener('click', function() {
          selectedDate = date;
          renderCalendar();
          renderDaySlots();
          if (activeTeacherId) { openStudentDayView(date, activeTeacherId); }
        });
        cell.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            selectedDate = date;
            renderCalendar();
            renderDaySlots();
            if (activeTeacherId) { openStudentDayView(date, activeTeacherId); }
          }
        });
      }
      grid.appendChild(cell);
    })(d);
  }
  var total    = startDow + daysInMonth;
  var trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (var t = 1; t <= trailing; t++) {
    grid.appendChild(makeDayCell(t, true));
  }
}

function makeDayCell(num, otherMonth, isToday, isSelected, hasAvail, hasMyBook) {
  var el = document.createElement('div');
  el.className = 'cal-day';
  if (otherMonth) el.classList.add('other-month');
  if (isToday)    el.classList.add('today');
  if (isSelected) el.classList.add('selected');
  if (hasAvail)   el.classList.add('has-avail');
  if (hasMyBook)  el.classList.add('has-mybook');
  el.textContent = num;
  return el;
}

/* ══════════════════════════════════════════════════════════
   DAY SLOT LIST
══════════════════════════════════════════════════════════ */
function renderDaySlots() {
  updateDayNavBar();
  var container = document.getElementById('day-slots');
  if (!container) return;
  container.innerHTML = '';

  if (!selectedDate || !activeTeacherId) return;

  /* Materialise recurring for selected week — mirrors teacher's renderDayPanel */
  var selMonday = new Date(selectedDate);
  var selDow = selMonday.getDay(); selDow = (selDow === 0) ? 6 : selDow - 1;
  selMonday.setDate(selMonday.getDate() - selDow);
  var selWeekDates = [];
  for (var wi = 0; wi < 7; wi++) {
    var wd = new Date(selMonday); wd.setDate(selMonday.getDate() + wi);
    selWeekDates.push(wd);
  }
  AppService.materialiseWeek(activeTeacherId, selWeekDates, function(e) {
    if (e) Toast.error(e.message || e);
  });

  var dateStr = fmtDate(selectedDate);
  var today   = fmtDate(new Date());
  var isPast  = dateStr < today;

  /* ── Same pipeline as renderMyBookingsList but scoped to one day + one teacher ── */

  /* 1. Booked slots for this student on this day — with pending map applied */
  var storeBooked = AppService.getSlotsByTeacherDateSync(activeTeacherId, dateStr)
    .filter(function(s) { return s.status === 'booked' && s.studentId === currentUser.uid; })
    .map(function(s) {
      var p = pendingDayChanges[s.slotId];
      if (p && p.action === 'cancel') {
        var copy = {}; for (var k in s) copy[k] = s[k];
        copy._pending = 'cancel';
        return copy;
      }
      return s;
    });

  /* 2. Pending-book slots not yet in Store */
  var pendingBookSlots = Object.keys(pendingDayChanges)
    .filter(function(id) {
      var p = pendingDayChanges[id];
      return p.action === 'book' &&
        p.originalSlot.date === dateStr &&
        p.originalSlot.teacherId === activeTeacherId &&
        !storeBooked.some(function(s) { return s.slotId === id; });
    })
    .map(function(id) {
      var orig = pendingDayChanges[id].originalSlot;
      var s = {}; for (var k in orig) s[k] = orig[k];
      s.status    = 'booked';
      s.studentId = currentUser.uid;
      s._pending  = 'book';
      return s;
    });

  var allBooked = storeBooked.concat(pendingBookSlots);

  /* 3. Merge into blocks — same function as My Bookings */
  var blocks = _mergeStudentBookingBlocks(dateStr, allBooked, today);

  /* 4. Free slots on this day (available, not booked by anyone else) */
  var freeSlots = AppService.getSlotsByTeacherDateSync(activeTeacherId, dateStr)
    .filter(function(s) { return s.status === 'available' && !s.studentId; });

  if (!blocks.length && !freeSlots.length) {
    var empty = document.createElement('p');
    empty.className = 'text-muted day-slots-empty';
    empty.textContent = _stuT('noSlotsToday');
    container.appendChild(empty);
    return;
  }

  /* 5. Free slots accordion — uses populateBookingDetail for in-place amber staging */
  if (freeSlots.length && !isPast) {
    var freeWrapper = document.createElement('div');
    freeWrapper.className = 'all-booking-block-wrapper';
    var freeHeader = document.createElement('div');
    freeHeader.className = 'all-booking-block-header';
    freeHeader.setAttribute('tabindex', '0');
    var freeLabel = document.createElement('span');
    freeLabel.className = 'all-booking-block-time';
    var freeChevron = document.createElement('span');
    freeChevron.className = 'all-booking-chevron';
    freeChevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    freeHeader.appendChild(freeLabel);
    freeHeader.appendChild(freeChevron);
    var freeDetail = document.createElement('div');
    freeDetail.className = 'all-booking-block-detail';
    freeDetail.classList.add('free-detail-padded');
    if (_daySlotsFreeOpen) {
      freeDetail.classList.add('is-open');
      freeChevron.classList.add('is-open');
    }
    var _freeDayTeacherId = activeTeacherId;
    var _freeDayDateStr   = dateStr;
    var _freeDayToday     = today;
    function _updateFreeLabel() {
      var pbc = freeSlots.filter(function(s) {
        return pendingDayChanges[s.slotId] && pendingDayChanges[s.slotId].action === 'book';
      }).length;
      var n = freeSlots.length - pbc;
      freeLabel.textContent = n + ' freie Slot' + (n !== 1 ? 's' : '');
    }
    function _repopulateFree() {
      _updateFreeLabel();
      var freeBlock = {
        dateStr: _freeDayDateStr, today: _freeDayToday,
        start: freeSlots[0].time,
        end: AppService.slotEndTime(freeSlots[freeSlots.length - 1].time),
        bookedSlots: [], hasPending: false, isFullyConfirmed: false,
        teacherId: _freeDayTeacherId
      };
      populateBookingDetail(freeDetail, freeBlock, {
        pendingMap:    pendingDayChanges,
        getSlots:      function() { return AppService.getSlotsByTeacherDateSync(_freeDayTeacherId, _freeDayDateStr); },
        showFreeSlots: true,
        stuId:         currentUser.uid,
        onConfirmSlot: null,
        onAddSlot:     function(s, map) {
          map[s.slotId] = { action: 'book', originalSlot: s, newStudentId: currentUser.uid };
        },
        onCancelSlot:  function(s, map, onAction) {
          /* Show policy/refund warning dialog — same as in booked-block detail */
          var endTime     = AppService.slotEndTime(s.time);
          var teacherName = AppService.getDisplayNameSync(_freeDayTeacherId);
          var _savedTeacherId = _freeDayTeacherId;
          var _savedDateStr   = _freeDayDateStr;
          _showCancelPolicyDialog(s, map, function() {
            updateDaySaveBtn();
            _updateMyBookingsBadges();
            renderMyBookingsList();
            var allSlots = AppService.getSlotsByTeacherDateSync(_savedTeacherId, _savedDateStr)
              .filter(function(sl) { return sl.status === 'booked' && sl.studentId === currentUser.uid; });
            if (allSlots.length) {
              allSlots.sort(function(a, b) { return a.time.localeCompare(b.time); });
              var newKey = _savedDateStr + '-' + allSlots[0].time + '-' + _savedTeacherId;
              expandedStudentBlocks[newKey] = true;
            }
            _repopulateFree();
            renderDaySlots();
          }, teacherName, s.time, endTime, s.date);
        },
        onAction: function() {
          updateDaySaveBtn();
          _updateMyBookingsBadges();
          renderMyBookingsList();
          _repopulateFree();
        }
      });
    }
    _repopulateFree();
    (function(hdr, det, chv) {
      function toggle() {
        var open = det.classList.contains('is-open');
        det.classList.toggle('is-open', !open);
        chv.classList.toggle('is-open', !open);
        _daySlotsFreeOpen = !open;
      }
      hdr.addEventListener('click', toggle);
      hdr.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') toggle(); });
    })(freeHeader, freeDetail, freeChevron);
    freeWrapper.appendChild(freeHeader);
    freeWrapper.appendChild(freeDetail);
    container.appendChild(freeWrapper);
  }

  /* 6. Render booked blocks — auto-expand blocks with pending changes */
  for (var bi = 0; bi < blocks.length; bi++) {
    var blk = blocks[bi];
    if (blk.hasPending) {
      var blockKey = blk.dateStr + '-' + blk.start + '-' + blk.teacherId;
      expandedStudentBlocks[blockKey] = true;
    }
    container.appendChild(_buildStudentBookingBlock(blk, isPast));
  }
}


var _closeSgridTeacherDropdown = null;

function openStudentGrid() {
  if (!activeTeacherId) return;

  /* Start on current week (Monday) */
  if (!sgridWeekStart) {
    var monday = new Date(TODAY);
    var dow = monday.getDay();
    dow = (dow === 0) ? 6 : dow - 1;
    monday.setDate(monday.getDate() - dow);
    sgridWeekStart = monday;
  }

  _buildSgridTeacherDropdown();

  document.getElementById('student-grid-overlay').classList.add('is-open');
  document.body.classList.add('overlay-open');

  _sgridMaterialiseAndRender();
}

function _buildSgridTeacherDropdown() {
  var list    = document.getElementById('sgrid-teacher-list');
  var label   = document.getElementById('sgrid-teacher-name');
  var trigger = document.getElementById('sgrid-teacher-trigger');
  if (!list || !label || !trigger) return;

  var myTeachers = AppService.getSelectionsByStudentSync(currentUser.uid)
    .map(function(sel) { return AppService.getUserSync(sel.teacherId); })
    .filter(Boolean);

  if (!myTeachers.length) {
    label.textContent = 'Kein Lehrer';
    return;
  }

  /* Ensure activeTeacherId is valid */
  if (!activeTeacherId || !myTeachers.some(function(t) { return t.uid === activeTeacherId; })) {
    activeTeacherId = myTeachers[0].uid;
  }

  function sgridSetTeacher(uid) {
    activeTeacherId = uid;
    label.textContent = AppService.getDisplayNameSync(uid);
    var items = list.querySelectorAll('.custom-dropdown-item');
    for (var k = 0; k < items.length; k++) {
      var active = items[k].getAttribute('data-value') === uid;
      items[k].classList.toggle('is-active', active);
      items[k].setAttribute('aria-selected', active ? 'true' : 'false');
    }
    list.classList.remove('is-open');
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    renderStudentGrid();
  }

  /* Rebuild list */
  list.innerHTML = '';
  for (var i = 0; i < myTeachers.length; i++) {
    (function(teacher) {
      var li = document.createElement('li');
      li.className = 'custom-dropdown-item' + (teacher.uid === activeTeacherId ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', teacher.uid);
      li.setAttribute('aria-selected', teacher.uid === activeTeacherId ? 'true' : 'false');
      li.textContent = AppService.getDisplayNameSync(teacher.uid);
      li.addEventListener('click', function(e) {
        e.stopPropagation();
        sgridSetTeacher(teacher.uid);
      });
      list.appendChild(li);
    })(myTeachers[i]);
  }

  label.textContent = AppService.getDisplayNameSync(activeTeacherId);

  trigger.onclick = function(e) {
    e.stopPropagation();
    var isOpen = list.classList.contains('is-open');
    list.classList.toggle('is-open', !isOpen);
    trigger.classList.toggle('is-open', !isOpen);
    trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
  };

  document.removeEventListener('click', _closeSgridTeacherDropdown);
  _closeSgridTeacherDropdown = function() {
    list.classList.remove('is-open');
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  };
  document.addEventListener('click', _closeSgridTeacherDropdown);
}

function closeStudentGrid() {
  document.getElementById('student-grid-overlay').classList.remove('is-open');
  document.body.classList.remove('overlay-open');
  renderStats();
}

function sgridPrevWeek() {
  sgridWeekStart.setDate(sgridWeekStart.getDate() - 7);
  _sgridMaterialiseAndRender();
}

function sgridNextWeek() {
  sgridWeekStart.setDate(sgridWeekStart.getDate() + 7);
  _sgridMaterialiseAndRender();
}

function sgridPrevMonth() {
  sgridWeekStart.setMonth(sgridWeekStart.getMonth() - 1);
  _sgridMaterialiseAndRender();
}

function sgridNextMonth() {
  sgridWeekStart.setMonth(sgridWeekStart.getMonth() + 1);
  _sgridMaterialiseAndRender();
}

/* Materialise ALL selected teachers for current week, then render */
function _sgridMaterialiseAndRender() {
  var weekDates  = getSgridWeekDates();
  var myTeachers = AppService.getSelectionsByStudentSync(currentUser.uid)
    .map(function(sel) { return AppService.getUserSync(sel.teacherId); })
    .filter(Boolean);

  var total   = myTeachers.length;
  var done    = 0;
  if (!total) { renderStudentGrid(); return; }

  myTeachers.forEach(function(t) {
    AppService.materialiseWeek(t.uid, weekDates, function(e) {
      if (e) Toast.error(e.message || e);
      done++;
      if (done === total) renderStudentGrid();
    });
  });
}

/* ── Week grid render ───────────────────────────────────── */
function renderStudentGrid() {
  var weekDates = getSgridWeekDates();

  document.getElementById('sgrid-week-label').textContent = sgridWeekRangeLabel(weekDates);

  // Pre-build slot lookup for ALL selected teachers: "tid|date|time" → slot
  var myTeacherIds = AppService.getSelectionsByStudentSync(currentUser.uid)
    .map(function(sel) { return sel.teacherId; });
  var allSlots = AppService.getAllSlotsSync();
  var slotMap  = {};
  for (var si = 0; si < allSlots.length; si++) {
    var s = allSlots[si];
    if (myTeacherIds.indexOf(s.teacherId) !== -1) {
      slotMap[s.teacherId + '|' + s.date + '|' + s.time] = s;
    }
  }

  var container = document.getElementById('sgrid-content');
  container.innerHTML = '';

  var table = document.createElement('table');
  table.className = 'slot-grid-table';

  // ── thead ──
  var thead = document.createElement('thead');
  var hrow  = document.createElement('tr');
  var thTime = document.createElement('th');
  thTime.className = 'grid-th-time';
  thTime.textContent = _stuT('gridHeaderTime');
  hrow.appendChild(thTime);

  for (var d = 0; d < weekDates.length; d++) {
    var wd      = weekDates[d];
    var isToday = wd.getTime() === TODAY.getTime();
    var th = document.createElement('th');
    th.className = 'grid-th-day';
    if (isToday) th.classList.add('grid-th-today');
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

  /* Same logic as teacher.js renderGridTable and Day View:
     48 UTC times ordered by local clock (00:00..23:30 local = row labels).
     Per-cell lookup converts local label → UTC for that specific date. */
  var _sgridTZ     = (typeof TimezoneService !== 'undefined') ? TimezoneService.getUserTimezone(currentUser.uid) : 'UTC';
  var _sgRefDate   = fmtDate(weekDates[0]); /* Monday as DST reference */
  var times        = _buildLocalOrderedUtcTimes(_sgRefDate, currentUser.uid);
  var localLabels  = [];
  for (var gi = 0; gi < 48; gi++) {
    var _lh = gi >> 1;
    var _lm = (gi % 2) * 30;
    localLabels.push((_lh < 10 ? '0' : '') + _lh + ':' + (_lm === 0 ? '00' : '30'));
  }

  for (var t = 0; t < times.length; t++) {
    var time       = times[t];       /* UTC (Mon-reference) */
    var localLabel = localLabels[t]; /* Local: 00:00..23:30 */
    var tr   = document.createElement('tr');
    var tdTime = document.createElement('td');
    tdTime.className = 'grid-td-time';
    tdTime.textContent = localLabel;
    tr.appendChild(tdTime);

    for (var dd = 0; dd < weekDates.length; dd++) {
      var cellDate    = weekDates[dd];
      var cellDateStr = fmtDate(cellDate);
      var isPastDay   = cellDate < TODAY;

      /* Per-cell UTC key — same DST fix as teacher.js renderGridTable */
      var cellUtcTime = time; /* fallback = Mon-reference UTC */
      if (typeof TimezoneService !== 'undefined') {
        var _sConv = TimezoneService.localToUtc(localLabel, cellDateStr, _sgridTZ);
        cellUtcTime = (_sConv.dateOffset === 0) ? _sConv.utcTime : null;
      }

      // Active teacher slot — look up by per-cell UTC key
      var slot         = (cellUtcTime && activeTeacherId)
        ? (slotMap[activeTeacherId + '|' + cellDateStr + '|' + cellUtcTime] || null)
        : null;
      var pendingEntry = slot ? pendingDayChanges[slot.slotId] : null;

      // Check if another selected teacher has this student booked here
      var otherSlot = null;
      if (cellUtcTime) {
        for (var ti = 0; ti < myTeacherIds.length; ti++) {
          if (myTeacherIds[ti] === activeTeacherId) continue;
          var os = slotMap[myTeacherIds[ti] + '|' + cellDateStr + '|' + cellUtcTime];
          if (os && os.status === 'booked' && os.studentId === currentUser.uid) {
            otherSlot = os;
            break;
          }
        }
      }

      var cellClass;
      var isClickable = false;

      if (isPastDay) {
        cellClass = otherSlot ? 'gc-other' : 'gc-empty';
      } else if (!slot || slot.status === 'disabled' || slot.status === 'timeout') {
        if (pendingEntry && pendingEntry.action === 'book') {
          cellClass   = 'gc-available gc-pending';
          isClickable = true;
        } else {
          cellClass = otherSlot ? 'gc-other' : 'gc-empty';
        }
      } else if (slot.status === 'available' || slot.status === 'recurring') {
        if (pendingEntry && pendingEntry.action === 'book') {
          cellClass = 'gc-mine gc-pending';
        } else {
          cellClass = otherSlot ? 'gc-other' : 'gc-available';
        }
        isClickable = !otherSlot;
      } else if (slot.status === 'booked' && slot.studentId === currentUser.uid) {
        cellClass   = (pendingEntry && pendingEntry.action === 'cancel') ? 'gc-available gc-pending' : 'gc-mine';
        isClickable = true;
      } else {
        cellClass = otherSlot ? 'gc-other' : 'gc-empty';
      }

      var td   = document.createElement('td');
      td.className = 'grid-td-cell';
      var cell = document.createElement('div');
      cell.className         = 'grid-cell ' + cellClass;
      cell.dataset.date      = cellDateStr;
      cell.dataset.time      = cellUtcTime || time;  /* UTC for writes */
      cell.dataset.localtime = localLabel;            /* local for display */
      cell.dataset.slotid    = slot ? slot.slotId : '';

      if (isClickable) cell.addEventListener('click', onStudentCellClick);

      td.appendChild(cell);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

function onStudentCellClick(e) {
  var cell      = e.currentTarget;
  var date      = cell.dataset.date;
  var time      = cell.dataset.time;         /* UTC — for slot lookup and policy logic */
  var slotId    = cell.dataset.slotid;
  var isMine    = cell.classList.contains('gc-mine');

  /* Get the real slot */
  var slot = slotId
    ? AppService.getAllSlotsSync().filter(function(x) { return x.slotId === slotId; })[0]
    : AppService.slotExistsSync(activeTeacherId, date, time);

  if (!slot) return;

  var pendingEntry   = pendingDayChanges[slot.slotId];
  var teacherName    = AppService.getDisplayNameSync(activeTeacherId);
  var endTime        = AppService.slotEndTime(time);                  /* UTC — for policy dialog */
  var displayTime    = cell.dataset.localtime || time;                /* local — for display */
  var displayEndTime = AppService.slotEndTime(displayTime);           /* local — for display */

  if (isMine || (pendingEntry && pendingEntry.action === 'cancel')) {

    /* Staged book — clicking again just undoes it, no dialog needed */
    if (pendingEntry && pendingEntry.action === 'book') {
      delete pendingDayChanges[slot.slotId];
      updateDaySaveBtn();
      _updateMyBookingsBadges();
      renderMyBookingsList();
      renderStudentGrid();
      return;
    }

    /* Booked (or staged cancel) — show popover with info + Stornieren/Undo */
    if (slot.confirmedAt && !pendingEntry) {
      Toast.error(_stuT('toastConfirmedSlot'));
      return;
    }
    var isStaged = !!(pendingEntry && pendingEntry.action === 'cancel');
    var result = Modal.show({
      title: isStaged ? 'Stornierung vorgemerkt' : 'Buchung',
      bodyHTML:
        '<div class="move-dialog">' +
          '<p class="move-dialog-info"><strong>' + teacherName + '</strong></p>' +
          '<p>' + displayTime + ' \u2013 ' + displayEndTime + ' &nbsp;&bull;&nbsp; ' + date + '</p>' +
          (isStaged ? '<p class="confirm-dialog-warning" style="margin-top:8px">\u26a0 Stornierung vorgemerkt \u2014 noch nicht gespeichert.</p>' : '') +
        '</div>',
      footerHTML:
        '<button class="btn btn-ghost" id="modal-cancel">Schlie\u00dfen</button>' +
        (slot.confirmedAt
          ? ''
          : '<button class="btn ' + (isStaged ? 'btn-ghost' : 'btn-danger') + '" id="modal-action">' +
            (isStaged ? _stuT('slotUndo') : _stuT('slotCancel')) + '</button>')
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    var actionBtn = document.getElementById('modal-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', function() {
        if (isStaged) {
          /* Undo staged cancel */
          delete pendingDayChanges[slot.slotId];
          updateDaySaveBtn();
          _updateMyBookingsBadges();
          renderMyBookingsList();
          renderStudentGrid();
          result.close();
        } else {
          /* Show policy dialog directly — single click, no intermediate step */
          result.close();
          _showCancelPolicyDialog(slot, pendingDayChanges, function() {
            updateDaySaveBtn();
            _updateMyBookingsBadges();
            renderMyBookingsList();
            renderStudentGrid();
          }, teacherName, time, endTime, date);
        }
      });
    }

  } else if (slot.status === 'available' || slot.status === 'recurring') {
    /* Free slot — undo or show confirm dialog */
    if (pendingEntry && pendingEntry.action === 'book') {
      /* Undo staged book */
      delete pendingDayChanges[slot.slotId];
      updateDaySaveBtn();
      _updateMyBookingsBadges();
      renderMyBookingsList();
      renderStudentGrid();
    } else {
      /* Confirm dialog before staging — with recurring option */
      var _slotPrice = AppService.getStudentPriceForTeacherSync(currentUser.uid, activeTeacherId) || 0;
      var _priceLine = _slotPrice > 0
        ? '<p class="recur-row-price" style="margin:0">' +
            (typeof _fmtForUser !== 'undefined'
              ? _fmtForUser(_slotPrice, currentUser.uid)
              : '\u20ac' + _slotPrice.toFixed(2).replace('.', ',')) +
            ' / Termin</p>'
        : '';
      var bookResult = Modal.show({
        title: 'Slot buchen?',
        bodyHTML:
          '<div class="move-dialog">' +
            '<p class="move-dialog-info"><strong>' + teacherName + '</strong></p>' +
            '<p>' + time + ' \u2013 ' + endTime + ' &nbsp;&bull;&nbsp; ' +
              new Date(date + "T00:00:00").toLocaleDateString("de-DE", {weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"}) +
            '</p>' +
            _priceLine +
          '</div>',
        footerHTML:
          '<button class="btn btn-ghost" id="modal-cancel">' + _stuT('modalBtnCancel') + '</button>' +
          '<button class="btn btn-secondary" id="modal-recurring">\u21bb Regelm\u00e4\u00dfig</button>' +
          '<button class="btn btn-primary" id="modal-action">Einmal buchen</button>'
      });
      document.getElementById('modal-cancel').addEventListener('click', bookResult.close);
      document.getElementById('modal-recurring').addEventListener('click', function() {
        bookResult.close();
        if (typeof _openRecurringBookingDialog === 'undefined') {
          Toast.error('Recurring-Dialog nicht verf\u00fcgbar.');
          return;
        }
        /* Build bundle from all staged slots on same day in SDV */
        var _bundleSlots5 = [];
        var _pdKeys5 = Object.keys(pendingDayChanges);
        for (var _bk5 = 0; _bk5 < _pdKeys5.length; _bk5++) {
          var _pe5 = pendingDayChanges[_pdKeys5[_bk5]];
          if (_pe5 && _pe5.action === 'book' && _pe5.originalSlot &&
              _pe5.originalSlot.date === slot.date) {
            _bundleSlots5.push(_pe5.originalSlot);
          }
        }
        if (!_bundleSlots5.length) _bundleSlots5 = [slot];
        _openRecurringBookingDialog({
          slot:        slot,
          bundleSlots: _bundleSlots5,
          teacherId:   activeTeacherId,
          stuId:       currentUser.uid,
          pendingMap:  pendingDayChanges,
          onConfirm:   function(pm) {
            updateDaySaveBtn();
            _updateMyBookingsBadges();
            renderMyBookingsList();
            renderStudentGrid();
          }
        });
      });
      document.getElementById('modal-action').addEventListener('click', function() {
        pendingDayChanges[slot.slotId] = { action: 'book', originalSlot: slot, newStudentId: currentUser.uid };
        updateDaySaveBtn();
        _updateMyBookingsBadges();
        renderMyBookingsList();
        renderStudentGrid();
        bookResult.close();
      });
    }
  }
}

/* ── Helpers ────────────────────────────────────────────── */
function getSgridWeekDates() {
  var dates = [];
  for (var d = 0; d < 7; d++) {
    var wd = new Date(sgridWeekStart);
    wd.setDate(wd.getDate() + d);
    dates.push(wd);
  }
  return dates;
}

function sgridWeekRangeLabel(dates) {
  return dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ' – '
    + dates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ════════════════════════════════════════════════════════
   DAY NAV BAR — ported from teacher.js, renderDayPanel → renderDaySlots
═══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   MY BOOKINGS
══════════════════════════════════════════════════════════ */
function renderMyBookings() {
  /* ── Teacher dropdown — mirrors teacher's student dropdown in All Bookings ── */
  var mbTeacherList    = document.getElementById('mb-teacher-list');
  var mbTeacherLabel   = document.getElementById('mb-teacher-label');
  var mbTeacherTrigger = document.getElementById('mb-teacher-trigger');

  if (mbTeacherList && mbTeacherLabel && mbTeacherTrigger) {
    var myTeachers = AppService.getSelectionsByStudentSync(currentUser.uid)
      .map(function(s) { return AppService.getUserSync(s.teacherId); })
      .filter(Boolean);

    var mbOptions = [{ value: 'all', text: 'Alle Lehrer' }];
    for (var ti = 0; ti < myTeachers.length; ti++) {
      mbOptions.push({ value: myTeachers[ti].uid, text: AppService.getDisplayNameSync(myTeachers[ti].uid) });
    }

    function mbSetTeacher(val) {
      _setFilter('student', val);
      var sel = mbOptions.filter(function(o) { return o.value === val; })[0] || mbOptions[0];
      mbTeacherLabel.textContent = sel.text;
      var items = mbTeacherList.querySelectorAll('.custom-dropdown-item');
      for (var k = 0; k < items.length; k++) {
        items[k].classList.toggle('is-active', items[k].getAttribute('data-value') === val);
      }
      mbTeacherList.classList.remove('is-open');
      mbTeacherTrigger.classList.remove('is-open');
      mbTeacherTrigger.setAttribute('aria-expanded', 'false');
      _updateMyBookingsBadges();
      renderMyBookingsList();
    }

    mbTeacherList.innerHTML = '';
    for (var oi = 0; oi < mbOptions.length; oi++) {
      (function(opt) {
        var li = document.createElement('li');
        li.className = 'custom-dropdown-item' + (opt.value === bookingsFilter.student ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.setAttribute('data-value', opt.value);
        li.setAttribute('aria-selected', opt.value === bookingsFilter.student ? 'true' : 'false');
        li.textContent = opt.text;
        li.addEventListener('click', function(e) { e.stopPropagation(); mbSetTeacher(opt.value); });
        mbTeacherList.appendChild(li);
      })(mbOptions[oi]);
    }

    var curOpt = mbOptions.filter(function(o) { return o.value === bookingsFilter.student; })[0] || mbOptions[0];
    mbTeacherLabel.textContent = curOpt.text;

    mbTeacherTrigger.onclick = function(e) {
      e.stopPropagation();
      var isOpen = mbTeacherList.classList.contains('is-open');
      mbTeacherList.classList.toggle('is-open', !isOpen);
      mbTeacherTrigger.classList.toggle('is-open', !isOpen);
      mbTeacherTrigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    };
    document.removeEventListener('click', _closeMbTeacherDropdown);
    _closeMbTeacherDropdown = function() {
      mbTeacherList.classList.remove('is-open');
      mbTeacherTrigger.classList.remove('is-open');
      mbTeacherTrigger.setAttribute('aria-expanded', 'false');
    };
    document.addEventListener('click', _closeMbTeacherDropdown);
  }

  /* ── Sort + Date-Range row — shared with teacher ── */
  var sortDateContainer = document.getElementById('mb-sort-date-row');
  if (sortDateContainer) {
    sortDateContainer.innerHTML = '';
    sortDateContainer.appendChild(_buildSortDateRangeRow(function() {
      renderMyBookingsList();
    }));
  }

  /* ── Zeitfilter-Buttons ── */
  var timeBtns = document.querySelectorAll('.mb-time-btn');
  for (var t = 0; t < timeBtns.length; t++) {
    timeBtns[t].classList.toggle('active', timeBtns[t].id === 'mb-filter-' + bookingsFilter.time);
    (function(btn) {
      btn.onclick = function() {
        _setFilter('time', btn.id.replace('mb-filter-', ''));
        allBookingsSortAsc = (bookingsFilter.time !== 'past');
        for (var j = 0; j < timeBtns.length; j++) timeBtns[j].classList.remove('active');
        btn.classList.add('active');
        _updateMyBookingsBadges();
        renderMyBookingsList();
      };
    })(timeBtns[t]);
  }

  /* ── Statusfilter-Buttons ── */
  var confirmBtns = document.querySelectorAll('.mb-confirm-btn');
  for (var ci = 0; ci < confirmBtns.length; ci++) {
    confirmBtns[ci].classList.toggle('active', confirmBtns[ci].dataset.confirm === bookingsFilter.confirmed);
    (function(btn) {
      btn.onclick = function() {
        _setFilter('confirmed', btn.dataset.confirm);
        for (var cj = 0; cj < confirmBtns.length; cj++) confirmBtns[cj].classList.remove('active');
        btn.classList.add('active');
        _updateMyBookingsBadges();
        renderMyBookingsList();
      };
    })(confirmBtns[ci]);
  }

  _updateMyBookingsBadges();
  renderMyBookingsList();
}

/* Student wrapper for shared badge updater */
function _updateMyBookingsBadges() {
  _updateBookingBadges({
    getSlots:    function() {
      return AppService.getSlotsByStudentSync(currentUser.uid)
        .filter(function(s) { return s.status === 'booked'; });
    },
    partyField:  'teacherId',
    mergeFn:     _mergeStudentBookingBlocks,
    priceFn:     function(s) { return parseFloat(s.price) || 0; },
    badgePrefix: 'mb-',
    containerId: null
  });
}

function renderMyBookingsList() {
  var container = document.getElementById('my-bookings-list');
  if (!container) return;
  container.innerHTML = '';

  var today = fmtDate(new Date());

  /* Mirror teacher renderAllBookingsList:
     - Keep status=booked slots from Store
     - Map pending-cancel to _pending='cancel' WITHOUT changing status (so they stay visible)
     - Add pending-book slots that aren't yet in Store */
  var storeBooked = AppService.getSlotsByStudentSync(currentUser.uid)
    .filter(function(s) { return s.status === 'booked'; })
    .map(function(s) {
      var p = pendingDayChanges[s.slotId];
      if (p && p.action === 'cancel') {
        var copy = {}; for (var k in s) copy[k] = s[k];
        copy._pending = 'cancel';
        return copy;
      }
      return s;
    });

  /* Also include pending-book slots not yet in Store */
  var pendingBookSlots = Object.keys(pendingDayChanges)
    .filter(function(id) {
      var p = pendingDayChanges[id];
      return p.action === 'book' &&
        !storeBooked.some(function(s) { return s.slotId === id; });
    })
    .map(function(id) {
      var s = {}; for (var k in pendingDayChanges[id].originalSlot) s[k] = pendingDayChanges[id].originalSlot[k];
      s.status    = 'booked';
      s.studentId = currentUser.uid;
      s._pending  = 'book';
      return s;
    });

  var slots = storeBooked.concat(pendingBookSlots);

  /* Teacher filter */
  if (bookingsFilter.student !== 'all') {
    slots = slots.filter(function(s) { return s.teacherId === bookingsFilter.student; });
  }

  slots = _applyTimeFilter(slots, bookingsFilter.time, today);
  slots = _applyDateRangeFilter(slots);

  if (bookingsFilter.confirmed === 'confirmed')   slots = slots.filter(function(s) { return !!s.confirmedAt; });
  else if (bookingsFilter.confirmed === 'unconfirmed') slots = slots.filter(function(s) { return !s.confirmedAt; });

  var emptyReasons = {
    past:     'Keine vergangenen Buchungen.',
    upcoming: 'Keine kommenden Buchungen.',
    all:      'Keine Buchungen gefunden.'
  };

  if (!slots.length) {
    var empty = document.createElement('p');
    empty.className = 'text-muted';
    empty.textContent = emptyReasons[bookingsFilter.time] || 'Keine Buchungen gefunden.';
    container.appendChild(empty);
    return;
  }

  slots.sort(function(a, b) {
    return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
  });

  /* Gruppe nach Datum */
  var byDate    = {};
  var dateOrder = [];
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    if (!byDate[s.date]) { byDate[s.date] = []; dateOrder.push(s.date); }
    byDate[s.date].push(s);
  }

  if (!allBookingsSortAsc) { dateOrder.reverse(); }

  for (var d = 0; d < dateOrder.length; d++) {
    var dateStr   = dateOrder[d];
    var dateSlots = byDate[dateStr];
    var isPast    = dateStr < today;

    /* ── Datum-Headline (wie Teacher) ── */
    var divider = document.createElement('div');
    divider.className = 'all-bookings-day-divider' + (isPast ? ' all-bookings-day-divider-past' : '');
    var dt = new Date(dateStr + 'T00:00:00');
    divider.textContent = dt.toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    container.appendChild(divider);

    /* ── Blöcke: konsekutive Slots desselben Lehrers zusammenfassen ── */
    var blocks = _mergeStudentBookingBlocks(dateStr, dateSlots, today);
    for (var b = 0; b < blocks.length; b++) {
      container.appendChild(_buildStudentBookingBlock(blocks[b], isPast));
    }
  }
}

/* Fasst aufeinanderfolgende Slots desselben Lehrers zu einem Block zusammen */
/* Student wrapper — merges by teacherId, resolves teacher display name */
function _mergeStudentBookingBlocks(dateStr, slots, today) {
  return mergeBookingBlocks(dateStr, slots, today, {
    groupField:   'teacherId',
    resolveParty: function(s) { return { teacherId: s.teacherId }; },
    viewerUid:    currentUser ? currentUser.uid : null
  });
}

/* Student wrapper for shared buildBookingBlock */
function _buildStudentBookingBlock(block, isPast) {
  return buildBookingBlock(block, {
    showDate:       false,
    isPast:         isPast,
    expandedBlocks: expandedStudentBlocks,
    blockKeyFn:     function(b) { return b.dateStr + '-' + b.start + '-' + b.teacherId; },
    nameFn:         function(b) { return AppService.getDisplayNameSync(b.teacherId); },
    priceFn:        function(b) {
      var lockedPrice = b.bookedSlots && b.bookedSlots[0] && b.bookedSlots[0].price;
      var price = parseFloat(lockedPrice) || 0;
      if (!price || isNaN(price)) return '';
      return _fmtForUser(price * b.bookedSlots.length, currentUser ? currentUser.uid : null);
    },
    onConfirmBlock: function(b) { _openStudentConfirmBlockDialog(b); },
    onEditBlock:    function(b) { _openStudentEditBlockDialog(b); },
    onReleaseBlock: null,
    onExpand:       function() { _daySlotsFreeOpen = false; },
    populateDetail: function(det, b) { _populateStudentBlockDetail(det, b, isPast); }
  });
}

/* Student wrapper for shared populateBookingDetail */
function _populateStudentBlockDetail(detail, block, isPast) {
  var teacherName = AppService.getDisplayNameSync(block.teacherId);
  populateBookingDetail(detail, block, {
    pendingMap:    pendingDayChanges,
    getSlots:      function(b) { return AppService.getSlotsByTeacherDateSync(b.teacherId, b.dateStr); },
    showFreeSlots: !block.isFullyConfirmed && !isPast,
    stuId:         currentUser.uid,
    onConfirmSlot: function(slotId) { _openStudentConfirmDialog(slotId); },
    slotPriceFn:   function(slot) {
      if (typeof CurrencyService === 'undefined') return fmtPrice(slot.price);
      var sCur = CurrencyService.getUserCurrency(currentUser.uid);
      if (sCur === 'EUR') return fmtPrice(slot.price, 'EUR');
      var converted = CurrencyService.convertSync(slot.price, 'EUR', sCur);
      if (converted === null) return fmtPrice(slot.price, 'EUR');
      return CurrencyService.format(converted, sCur);
    },
    onAddSlot:     function(s, map) {
      map[s.slotId] = { action: 'book', originalSlot: s, newStudentId: currentUser.uid };
    },
    onCancelSlot:  function(s, map, onAction) {
      /* Stage cancellation — policy dialog shown at Done/commit time */
      var original = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0] || s;
      map[s.slotId] = { action: 'cancel', originalSlot: original, newStudentId: null };
      if (onAction) onAction();
    },
    onAction: function() {
      updateDaySaveBtn();
      _updateMyBookingsBadges();
      renderMyBookingsList();
      renderDaySlots();  /* rebuild so amber/undo state reflects correctly */
    }
  });
}
function _openStudentConfirmBlockDialog(block) {
  var teacherName  = AppService.getDisplayNameSync(block.teacherId);
  var bookedSlots  = block.bookedSlots || [];
  var slotCount    = bookedSlots.length;
  var firstSlot    = slotCount ? AppService.getAllSlotsSync().filter(function(s){ return s.slotId === bookedSlots[0].slotId; })[0] : null;
  var dateLabel    = firstSlot ? (function() {
    var d = new Date(firstSlot.date + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  })() : '';

  /* Load ALL escrows for all slots in the block, then sum amounts */
  function _loadAllEscrows(slots, cb) {
    if (!slots.length) { cb([]); return; }
    var results = [];
    var pending = slots.length;
    slots.forEach(function(s) {
      AppService.getEscrowBySlot(s.slotId, function(err, esc) {
        if (esc) results.push(esc);
        if (--pending === 0) cb(results);
      });
    });
  }

  function _show(escrows) {
    /* Aggregate across all escrows */
    var totalFull    = 0;
    var totalDeposit = 0;
    var depositStatus = null;
    var paymentMode   = 'instant';
    var requiresDep   = false;
    var depositType   = 'fixed';
    var depositPct    = null;

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

    /* Build synthetic aggregated escrow for the shared body builder */
    var syntheticEscrow = escrows.length ? {
      fullAmount:      totalFull,
      depositAmount:   totalDeposit,
      depositStatus:   depositStatus,
      paymentMode:     paymentMode,
      requiresDeposit: requiresDep,
      depositType:     depositType,
      depositPercent:  depositPct
    } : null;

    var wallet   = AppService.getWalletSync ? AppService.getWalletSync(currentUser.uid) : null;
    var slotNote = slotCount > 1 ? slotCount + ' Slots' : '1 Slot';
    var bodyHTML = _buildConfirmDetailBody({
      teacherName: teacherName, dateLabel: dateLabel + ' &bull; ' + slotNote,
      timeStart: block.start, timeEnd: block.end,
      escrow: syntheticEscrow,
      walletBalance: wallet ? wallet.balance : null,
      actorRole: 'student'
    });

    var result = Modal.show({
      title: 'Buchung bestätigen', bodyHTML: bodyHTML,
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">' + _stuT('modalBtnCancel') + '</button>' +
                  '<button class="btn btn-primary" id="modal-confirm">Jetzt bestätigen</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      result.close();
      AppService.confirmBlock(block.bookedSlots, function(e) {
        if (e) { Toast.error(_stuT('toastConfirmError') + (e.message || e)); return; }
        Toast.success(_stuT('toastConfirmedBooking'));
        renderStats(); _updateMyBookingsBadges(); renderMyBookingsList();
        if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(currentUser.uid);
      });
    });
  }

  _loadAllEscrows(bookedSlots, _show);
}

/* Student Edit Block Dialog — reuses openMoveBlockDialogShared from ui.js */
function _openStudentEditBlockDialog(block) {
  /* Use displayName override so teacher name shows correctly regardless of profile state */
  var teacherName = AppService.getDisplayNameSync(block.teacherId);

  /* Build block with student field for compatibility with openMoveBlockDialogShared */
  var studentBlock = {};
  for (var k in block) studentBlock[k] = block[k];
  studentBlock.student = { uid: currentUser.uid }; /* needed for slot lookup context */

  openMoveBlockDialogShared({
    block:        studentBlock,
    teacherId:    block.teacherId,
    actorRole:    'student',
    pendingMap:   pendingDayChanges,  /* wire student pending system */
    stuId:        currentUser.uid,
    displayName:  teacherName,        /* override: show teacher name, not student name */
    onConfirmBlock: function() {
      pendingDayChanges = {};
      updateDaySaveBtn();
      _updateMyBookingsBadges();
      renderMyBookingsList();
    },
    onCancelBlock: function() {
      pendingDayChanges = {};
      updateDaySaveBtn();
      renderStats();
      _updateMyBookingsBadges();
      renderMyBookingsList();
      renderCalendar();
      renderDaySlots();  /* refresh day view so cancelled slots are no longer shown */
      /* WalletPanel.refresh and navbar update are handled inside
         _showCancelBlockPolicyDialog before onAction fires — no duplicate call here */
    },
    onConfirm: function(movedPending, dialogOpts) {
      /* Capture move opts by teacherId for writeMoveRecord */
      if (arguments[1] && arguments[1]._lastMoveOpts) {
        pendingMoveOpts[block.teacherId] = arguments[1]._lastMoveOpts;
      }
      updateDaySaveBtn();
      renderStats();
      _updateMyBookingsBadges();
      renderMyBookingsList();
      renderCalendar();
      renderDaySlots();
    },
    onCalJump: function(dateStr) {
      if (!dateStr) return;
      var d = new Date(dateStr + 'T00:00:00');
      d.setHours(0,0,0,0);
      selectedDate = d;
      viewYear  = d.getFullYear();
      viewMonth = d.getMonth();
      switchView('calendar');
    }
  });
}

/* Block-Level Stornierung (alle Slots des Blocks) */
function _openStudentConfirmDialog(slotId) {
  var slot = AppService.getAllSlotsSync().filter(function(s) { return s.slotId === slotId; })[0];
  if (!slot) return;
  var teacherName = AppService.getDisplayNameSync(slot.teacherId);
  var endTime     = AppService.slotEndTime(slot.time);
  var dateObj     = new Date(slot.date + 'T00:00:00');
  var dateLabel   = dateObj.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

  /* Load escrow + wallet in parallel, then show dialog */
  AppService.getEscrowBySlot(slotId, function(err, escrow) {
    var wallet = AppService.getWalletSync ? AppService.getWalletSync(currentUser.uid) : null;

    var bodyHTML = _buildConfirmDetailBody({
      teacherName: teacherName, dateLabel: dateLabel,
      timeStart: slot.time, timeEnd: endTime,
      escrow: escrow, walletBalance: wallet ? wallet.balance : null,
      actorRole: 'student', actorUid: currentUser ? currentUser.uid : null
    });

    var result = Modal.show({
      title: 'Buchung best\u00E4tigen',
      bodyHTML: bodyHTML,
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>'
               + '<button class="btn btn-primary" id="modal-confirm">Jetzt best\u00E4tigen</button>'
    });

    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      try {
        AppService.confirmSlot(slotId, function(e){if(e)Toast.error(e.message||e);});
        var msg = releaseNow > 0 ? _fmtForUser(releaseNow, currentUser ? currentUser.uid : null) + ' freigegeben.' : _stuT('toastConfirmedBooking');
        Toast.success(msg);
        renderStats();
        _updateMyBookingsBadges();
        renderMyBookingsList();
        result.close();
      } catch (e) {
        Toast.error(_stuT('toastConfirmError') + e.message);
        result.close();
      }
    });
  });
}

function getSectionJumpTargets() {
  if (activeView === 'my-bookings') {
    var dividers = document.querySelectorAll('#view-my-bookings .all-bookings-day-divider');
    var pageTop  = document.querySelector('.page-header') || document.getElementById('view-my-bookings');
    if (dividers.length) return [pageTop].concat(Array.prototype.slice.call(dividers)).filter(Boolean);
    return [pageTop].filter(Boolean);
  }
  if (activeView === 'calendar') {
    return [
      document.querySelector('.page-header'),
      document.getElementById('cal-section'),
      document.getElementById('day-slots-wrapper')
    ].filter(Boolean);
  }
  return [document.querySelector('.page-header')].filter(Boolean);
}

/* Thin wrappers — call shared ui.js implementations with local render functions */
function navDay(delta)   { _navDayShared(delta, renderDaySlots); }
function navMonth(delta) { _navMonthShared(delta, renderDaySlots); }
function checkDayNavSticky() { checkDayNavStickyShared('day-slots-wrapper'); }

function updateJumpBtns() { _updateJumpBtnsShared((activeView === 'my-bookings' || activeView === 'calendar') && getSectionJumpTargets().length > 1); }

function prevMonth() { _prevMonthShared(renderDaySlots); }
function nextMonth() { _nextMonthShared(renderDaySlots); }

/* ── Public API: refreshPrices ──────────────────────────────
   Called by Navbar when user changes currency.
   Re-renders the catalog tab so teacher card prices update
   without a full page reload.                               */
window.StudentView = window.StudentView || {};
window.StudentView.refreshPrices = function() {
  if (typeof renderCatalog === 'function') {
    renderCatalog();
  }
};

/* ══════════════════════════════════════════════════════════
   STUDENT DAY VIEW
   Variables, render, open/close, staged booking logic
══════════════════════════════════════════════════════════ */

var _sdvDate      = null;   /* current Date object */
var _sdvTeacherId = null;   /* active teacher uid */
var _sdvOpen      = false;
var _sdvPending   = {};     /* { slotId: 'book' | 'cancel' } */

var _SDV_WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
var _SDV_MONTHS   = ['Januar','Februar','März','April','Mai','Juni',
                     'Juli','August','September','Oktober','November','Dezember'];

/* ── Open / Close ───────────────────────────────────────── */
function openStudentDayView(date, teacherId) {
  _sdvDate      = (date instanceof Date) ? date : new Date(date + 'T00:00:00');
  _sdvTeacherId = teacherId || activeTeacherId;
  _sdvPending       = {};
  pendingDayChanges = {}; /* clear old-system pending on day view open */
  _sdvOpen          = true;

  var overlay = document.getElementById('student-day-view-overlay');
  overlay.classList.add('is-open');
  _sdvRenderTopbar();
  _sdvRenderSlots();
  _sdvUpdateFab();
}

function closeStudentDayView() {
  /* Warn if there are unsaved pending changes */
  var keys = Object.keys(pendingDayChanges);
  if (keys.length > 0) {
    var result = Modal.show({
      title: 'Ungespeicherte Änderungen',
      bodyHTML: '<p>' + keys.length + ' Buchung(en) noch nicht gespeichert. Trotzdem schließen?</p>',
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">' + _stuT('modalBtnCancel') + '</button>' +
                  '<button class="btn btn-danger" id="modal-confirm">Verwerfen &amp; Schließen</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      result.close();
      _sdvDoClose();
    });
    return;
  }
  _sdvDoClose();
}

function _sdvDoClose() {
  _sdvOpen = false;
  document.getElementById('student-day-view-overlay').classList.remove('is-open');
  /* Clear all pending and cancel any in-flight async callbacks */
  _saveSummaryGeneration++;
  pendingDayChanges = {};
  _sdvPending = {};
  updateDaySaveBtn(); /* hides FAB + summary */
}

/* ── Topbar ─────────────────────────────────────────────── */
function _sdvRenderTopbar() {
  if (!_sdvDate) return;
  var teacherName = _sdvTeacherId ? AppService.getDisplayNameSync(_sdvTeacherId) : 'Lehrer';
  document.getElementById('sdv-teacher-name').textContent = teacherName;
  document.getElementById('sdv-weekday').textContent = _SDV_WEEKDAYS[_sdvDate.getDay()];
  document.getElementById('sdv-date').textContent =
    _sdvDate.getDate() + '. ' + _SDV_MONTHS[_sdvDate.getMonth()] + ' ' + _sdvDate.getFullYear();
}

/* ── Slot list ──────────────────────────────────────────── */
function _sdvRenderSlots() {
  var container = document.getElementById('sdv-slot-list');
  container.innerHTML = '';

  if (!_sdvDate || !_sdvTeacherId || !currentUser) return;

  var dateStr  = fmtDate(_sdvDate);
  var todayStr = fmtDate(new Date());
  var isPastDay = dateStr < todayStr;

  /* Materialise recurring for this week */
  var dow = _sdvDate.getDay();
  var monday = new Date(_sdvDate);
  monday.setDate(_sdvDate.getDate() - ((dow === 0) ? 6 : dow - 1));
  var weekDates = [];
  for (var wi = 0; wi < 7; wi++) {
    var wd = new Date(monday);
    wd.setDate(monday.getDate() + wi);
    weekDates.push(wd);
  }
  AppService.materialiseWeek(_sdvTeacherId, weekDates, function(e) { if (e) Toast.error(e.message || e); });

  var slots = AppService.getSlotsByTeacherDateSync(_sdvTeacherId, dateStr);

  /* Build slot lookup: UTC time → slot */
  var slotMap = {};
  for (var si = 0; si < slots.length; si++) {
    slotMap[slots[si].time] = slots[si];
  }

  /* ── Build time grid in teacher-local order (same fix as teacher day view) ──
     Student sees the teacher's local calendar — grid must start at teacher local 00:00.
     Sections compare against student-local display time. */
  var _sdvTimes = [];
  var _sdvOffsetMin = 0;
  if (typeof TimezoneService !== 'undefined' && _sdvTeacherId) {
    var _sdvTZ = TimezoneService.getUserTimezone(_sdvTeacherId);
    _sdvOffsetMin = TimezoneService.getOffsetMinutes(_sdvTZ, dateStr);
  }
  var _sdvMidnightUtc = ((-_sdvOffsetMin) % 1440 + 1440) % 1440;
  for (var gi2 = 0; gi2 < 48; gi2++) {
    var _sdvUtcMin = (_sdvMidnightUtc + gi2 * 30) % 1440;
    var _sdvH = Math.floor(_sdvUtcMin / 60);
    var _sdvM = _sdvUtcMin % 60;
    _sdvTimes.push((_sdvH < 10 ? '0' : '') + _sdvH + ':' + (_sdvM < 10 ? '0' : '') + _sdvM);
  }

  /* Sections compare against STUDENT local display time */
  var sections = [
    { label: 'Morgen',     from: '06:00', to: '09:30' },
    { label: 'Vormittag',  from: '10:00', to: '11:30' },
    { label: 'Mittag',     from: '12:00', to: '13:30' },
    { label: 'Nachmittag', from: '14:00', to: '17:30' },
    { label: 'Abend',      from: '18:00', to: '22:00' }
  ];
  var sectionRendered = {};
  var sectionIdx = 0;
  var frag = document.createDocumentFragment();
  var anyVisible = false;

  for (var ti = 0; ti < _sdvTimes.length; ti++) {
    var time = _sdvTimes[ti];
    var slot = slotMap[time] || null;

    /* Determine what student sees for this time slot */
    var cellState = _sdvGetCellState(slot, time, isPastDay);

    /* Skip invisible slots (empty/timeout/disabled future) */
    if (!cellState.visible) continue;

    anyVisible = true;

    /* Section label — compare against student local display time */
    var _sdvLocalT = _tStudentDisplay(time, dateStr, _sdvTeacherId).localTime;
    for (var sci = sectionIdx; sci < sections.length; sci++) {
      if (_sdvLocalT >= sections[sci].from && _sdvLocalT <= sections[sci].to && !sectionRendered[sci]) {
        var lbl = document.createElement('div');
        lbl.className = 'dv-section-label';
        lbl.setAttribute('aria-hidden', 'true');
        lbl.textContent = sections[sci].label;
        frag.appendChild(lbl);
        sectionRendered[sci] = true;
        sectionIdx = sci;
        break;
      }
    }

    frag.appendChild(_sdvBuildRow(slot, time, dateStr, cellState));
  }

  if (!anyVisible) {
    var emptyState = document.createElement('div');
    emptyState.className = 'dv-empty-state';
    var emptyText = document.createElement('p');
    emptyText.className = 'dv-empty-state-text';
    emptyText.textContent = isPastDay
      ? 'Keine vergangenen Buchungen an diesem Tag.'
      : 'Keine verfügbaren Slots an diesem Tag.';
    emptyState.appendChild(emptyText);
    container.appendChild(emptyState);
    return;
  }

  container.appendChild(frag);
}

/* ── Determine what the student sees for one time slot ─── */
function _sdvGetCellState(slot, time, isPastDay) {
  /* Check pending */
  var _pdc = slot ? pendingDayChanges[slot.slotId] : null;
  var pendingAction = _pdc ? _pdc.action : null;

  if (isPastDay) {
    /* Past day: only show own bookings */
    if (slot && slot.status === 'booked' && slot.studentId === currentUser.uid) {
      return { visible: true, rowClass: 'dv-s-past', type: 'mine-past', clickable: false };
    }
    return { visible: false };
  }

  if (!slot || slot.status === 'disabled' || slot.status === 'timeout') {
    /* Nothing to show for student — unless pending book */
    if (pendingAction === 'book') {
      return { visible: true, rowClass: 'dv-s-pending', type: 'pending-book', clickable: true };
    }
    return { visible: false };
  }

  if (slot.status === 'available' || slot.status === 'recurring') {
    if (pendingAction === 'book') {
      return { visible: true, rowClass: 'dv-s-pending', type: 'pending-book', clickable: true };
    }
    return { visible: true, rowClass: 'dv-s-available', type: 'available', clickable: true };
  }

  if (slot.status === 'booked') {
    if (slot.studentId === currentUser.uid) {
      /* Own booking */
      if (pendingAction === 'cancel') {
        return { visible: true, rowClass: 'dv-s-pending', type: 'pending-cancel', clickable: true };
      }
      return { visible: true, rowClass: 'dv-s-mine', type: 'mine', clickable: true };
    }
    /* Teacher-booked slot: invisible for all other students.
       Availability and bookings are separate concerns for teachers.
       A teacher can book any slot regardless of availability status -
       other students must never see or interact with these slots. */
    if (slot.bookedByRole === 'teacher') {
      return { visible: false };
    }
    /* Another student's booking — show as "Belegt" anonymously */
    return { visible: true, rowClass: 'dv-s-other', type: 'other', clickable: false };
  }

  return { visible: false };
}

/* ── Build one slot row ─────────────────────────────────── */
function _sdvBuildRow(slot, time, dateStr, cellState) {
  /* Convert UTC → student local time — mockup-_sdvBuildRow-2026-03-24_09-38 */
  var _disp  = _tStudentDisplay(time, dateStr, _sdvTeacherId);
  var _local = _disp.localTime;

  var stateClass = {
    'available':     'sdv-s-available',
    'mine':          'sdv-s-mine',
    'mine-past':     'sdv-s-past',
    'other':         'sdv-s-other',
    'pending-book':  'sdv-s-pending',
    'pending-cancel':'sdv-s-pending'
  }[cellState.type] || 'sdv-s-other';

  var row = document.createElement('div');
  row.className = 'sdv-slot-row ' + stateClass;
  row.setAttribute('role', 'listitem');
  row.setAttribute('aria-label', _local);

  /* Time — start only */
  var timeEl = document.createElement('div');
  timeEl.className = 'sdv-time';
  timeEl.textContent = _local;

  /* Short divider */
  var divEl = document.createElement('div');
  divEl.className = 'sdv-div';
  divEl.setAttribute('aria-hidden', 'true');

  var info   = document.createElement('div');
  info.className = 'sdv-info';
  var action = document.createElement('div');
  action.className = 'sdv-action';

  switch (cellState.type) {

    case 'available':
      var statusEl = document.createElement('span');
      statusEl.className = 'sdv-status';
      statusEl.textContent = _stuT('slotAvailable');
      info.appendChild(statusEl);
      var price = AppService.getStudentPriceForTeacherSync(currentUser.uid, _sdvTeacherId) || null;
      if (price) {
        var priceEl = document.createElement('span');
        priceEl.className = 'sdv-price';
        priceEl.textContent = price + ' €';
        info.appendChild(priceEl);
      }
      if (_disp.badgeHTML && _disp.offsetLabel) {
        var tzBadge = document.createElement('span');
        tzBadge.className = 'sdv-tz-badge';
        tzBadge.textContent = _disp.offsetLabel;
        info.appendChild(tzBadge);
      }
      var bookBtn = document.createElement('button');
      bookBtn.className = 'sdv-btn-book';
      bookBtn.textContent = _stuT('slotBook');
      bookBtn.setAttribute('aria-label', 'Slot ' + _local + ' buchen');
      (function(s, t, ds) {
        bookBtn.addEventListener('click', function() { _sdvStageBook(s, t, ds); });
      })(slot, time, dateStr);
      action.appendChild(bookBtn);
      break;

    case 'mine':
      var mineEl = document.createElement('span');
      mineEl.className = 'sdv-status';
      mineEl.textContent = _stuT('slotMyBooking');
      info.appendChild(mineEl);
      if (slot.confirmedAt) {
        var confBadge = document.createElement('span');
        confBadge.className = 'sdv-conf-badge';
        confBadge.textContent = _stuT('slotConfirmed');
        info.appendChild(confBadge);
      } else {
        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'sdv-btn-cancel';
        cancelBtn.textContent = _stuT('slotCancel');
        cancelBtn.setAttribute('aria-label', 'Buchung ' + _local + ' stornieren');
        (function(s) {
          cancelBtn.addEventListener('click', function() { _sdvStageCancel(s); });
        })(slot);
        action.appendChild(cancelBtn);
      }
      break;

    case 'mine-past':
      var minePastEl = document.createElement('span');
      minePastEl.className = 'sdv-status';
      minePastEl.textContent = _stuT('slotMyBooking');
      info.appendChild(minePastEl);
      break;

    case 'other':
      var otherEl = document.createElement('span');
      otherEl.className = 'sdv-status';
      otherEl.textContent = _stuT('slotBooked');
      info.appendChild(otherEl);
      break;

    case 'pending-book':
      var pendEl = document.createElement('span');
      pendEl.className = 'sdv-status';
      pendEl.textContent = _stuT('slotPending');
      info.appendChild(pendEl);
      var undoBookBtn = document.createElement('button');
      undoBookBtn.className = 'sdv-btn-undo';
      undoBookBtn.textContent = _stuT('slotUndo');
      (function(s, t) {
        undoBookBtn.addEventListener('click', function() { _sdvUndoPending(s, t); });
      })(slot, time);
      action.appendChild(undoBookBtn);
      break;

    case 'pending-cancel':
      var pendCancelEl = document.createElement('span');
      pendCancelEl.className = 'sdv-status';
      pendCancelEl.textContent = _stuT('slotPendingCancel');
      info.appendChild(pendCancelEl);
      var undoCancelBtn = document.createElement('button');
      undoCancelBtn.className = 'sdv-btn-undo';
      undoCancelBtn.textContent = _stuT('slotUndo');
      (function(s) {
        undoCancelBtn.addEventListener('click', function() { _sdvUndoPending(s, null); });
      })(slot);
      action.appendChild(undoCancelBtn);
      break;
  }

  row.appendChild(timeEl);
  row.appendChild(divEl);
  row.appendChild(info);
  row.appendChild(action);
  return row;
}

/* ── Staging ─────────────────────────────────────────────── */
function _sdvStageBook(slot, time, dateStr) {
  if (!slot) return;
  pendingDayChanges[slot.slotId] = { action: 'book', originalSlot: slot };
  _sdvRenderSlots();
  _sdvUpdateFab();
}

function _sdvStageCancel(slot) {
  pendingDayChanges[slot.slotId] = { action: 'cancel', originalSlot: slot };
  _sdvRenderSlots();
  _sdvUpdateFab();
}

function _sdvUndoPending(slot, time) {
  if (slot && slot.slotId) delete pendingDayChanges[slot.slotId];
  _sdvRenderSlots();
  _sdvUpdateFab();
}

/* ── Save / Discard ─────────────────────────────────────── */
function _sdvSavePending() {
  /* Read from pendingDayChanges — same store as old day-slots system */
  var keys = Object.keys(pendingDayChanges);
  if (!keys.length) return;

  var errors = [];
  var done   = 0;
  var total  = keys.length;

  function onDone(e) {
    if (e) errors.push(e.message || String(e));
    done++;
    if (done >= total) {
      pendingDayChanges = {};
      _sdvPending = {};
      _sdvRenderSlots();
      _sdvUpdateFab();
      renderCalendar();
      renderDaySlots();
      if (errors.length) { Toast.error(errors.join(', ')); }
      else { Toast.success('Buchungen gespeichert.'); }
    }
  }

  for (var ki = 0; ki < keys.length; ki++) {
    var entry = pendingDayChanges[keys[ki]];
    if (!entry || !entry.originalSlot) { onDone(null); continue; }
    var slotId = entry.originalSlot.slotId;
    if (entry.action === 'book') {
      AppService.bookSlotWithEscrowSilent(slotId, currentUser.uid, entry.originalSlot.teacherId, onDone, 'student');
    } else if (entry.action === 'cancel') {
      AppService.cancelSlotWithPolicy(slotId, 'student', onDone);
    } else {
      onDone(null);
    }
  }
}

function _sdvDiscardPending() { discardAllPending(); }

/* ── FAB update ─────────────────────────────────────────── */
function _sdvUpdateFab() {
  /* Delegate entirely to updateDaySaveBtn — it manages #day-save-group visibility,
     the affordability check, and #day-save-summary (calculation panel). */
  updateDaySaveBtn();
}

/* ── Small helpers ───────────────────────────────────────── */
function _sdvMakePill(cls, label) {
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

function _sdvMakeActionBtn(cls, label, svgHTML) {
  var btn = document.createElement('button');
  btn.className = 'dv-action-btn ' + cls;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = svgHTML;
  return btn;
}

function _sdvSvgPlus() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
}
function _sdvSvgX() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
}
function _sdvSvgUndo() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>';
}

/* ── Wire up listeners — called once from student.js init ─ */
function _sdvInitListeners() {
  document.getElementById('sdv-back-btn').addEventListener('click', closeStudentDayView);

  document.getElementById('sdv-prev-day').addEventListener('click', function() {
    if (!_sdvDate) return;
    var d = new Date(_sdvDate);
    d.setDate(d.getDate() - 1);
    /* Reset pending on day change */
    _sdvPending = {};
    _sdvDate = d;
    _sdvRenderTopbar();
    _sdvRenderSlots();
    _sdvUpdateFab();
  });

  document.getElementById('sdv-next-day').addEventListener('click', function() {
    if (!_sdvDate) return;
    var d = new Date(_sdvDate);
    d.setDate(d.getDate() + 1);
    _sdvPending = {};
    _sdvDate = d;
    _sdvRenderTopbar();
    _sdvRenderSlots();
    _sdvUpdateFab();
  });

  /* sdv now reuses day-save-group buttons — no separate sdv-fab listeners needed */
}
