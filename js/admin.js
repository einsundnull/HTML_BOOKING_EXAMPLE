/**
 * admin.js — Admin View Logic
 *
 * Regeln: var only, function(){}, no arrow, no template literals,
 *         no ?. or ??, kein inline-style — classList only.
 */

var currentUser      = null;
var activeTab        = 'teacher';

/* ── Admin time helper: UTC → teacher local ── */
function _tAdminTime(utcTimeStr, dateStr, teacherId) {
  if (!utcTimeStr || typeof TimezoneService === 'undefined') return utcTimeStr || '';
  var tz = teacherId ? TimezoneService.getUserTimezone(teacherId) : 'UTC';
  return TimezoneService.utcToLocal(utcTimeStr, dateStr || '', tz).localTime;
}
function _tAdminEndTime(utcTimeStr, dateStr, teacherId) {
  return AppService.slotEndTime ? AppService.slotEndTime(_tAdminTime(utcTimeStr, dateStr, teacherId)) : '';
}
var activeMainTab    = 'users';
var activeEscrowFilter  = 'held';
var activePaymentSubTab = 'escrows';
var _allTxFilters   = { type: 'all', dateFrom: '', dateTo: '', teacher: 'all', student: 'all' };
var _bkFilters      = { status: 'all', teacher: 'all', student: 'all', dateFrom: '', dateTo: '' };

window.addEventListener('load', function() {
  currentUser = Auth.require('admin');
  if (!currentUser) return;
  function _initAdmin() {
  Navbar.init('admin');

  /* ── Haupt-Tabs (Benutzer / Zahlungen) ── */
  var mainTabBtns = document.querySelectorAll('.admin-tab-btn');
  for (var m = 0; m < mainTabBtns.length; m++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        activeMainTab = btn.dataset.mainTab;
        for (var i = 0; i < mainTabBtns.length; i++) { mainTabBtns[i].classList.remove('active'); }
        btn.classList.add('active');
        document.getElementById('admin-tab-users').classList.toggle('is-hidden', activeMainTab !== 'users');
        document.getElementById('admin-tab-payments').classList.toggle('is-hidden', activeMainTab !== 'payments');
        document.getElementById('admin-tab-audit').classList.toggle('is-hidden', activeMainTab !== 'audit');
        if (activeMainTab === 'payments') {
          if (activePaymentSubTab === 'escrows') renderEscrows();
          else renderAllTx();
        }
        if (activeMainTab === 'audit')    renderAuditLog();
      });
    })(mainTabBtns[m]);
  }

  /* ── User-Tab-Wechsel (Lehrer / Schüler) ── */
  var tabBtns = document.querySelectorAll('.segmented-btn');
  for (var t = 0; t < tabBtns.length; t++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        activeTab = btn.dataset.tab;
        for (var i = 0; i < tabBtns.length; i++) { tabBtns[i].classList.remove('active'); }
        btn.classList.add('active');
        renderTable();
      });
    })(tabBtns[t]);
  }

  /* ── Escrow-Filter-Chips ── */
  var escrowFilters = document.querySelectorAll('[data-escrow-filter]');
  for (var ef = 0; ef < escrowFilters.length; ef++) {
    (function(chip) {
      chip.addEventListener('click', function() {
        activeEscrowFilter = chip.dataset.escrowFilter;
        for (var i = 0; i < escrowFilters.length; i++) { escrowFilters[i].classList.remove('active'); }
        chip.classList.add('active');
        renderEscrows();
      });
    })(escrowFilters[ef]);
  }

  /* ── Escrow Aktualisieren ── */
  var refreshBtn = document.getElementById('escrow-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', renderEscrows);

  /* ── Payment Sub-Tabs ── */
  var subTabBtns = document.querySelectorAll('.admin-subtab-btn');
  for (var st = 0; st < subTabBtns.length; st++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        activePaymentSubTab = btn.dataset.subtab;
        for (var i = 0; i < subTabBtns.length; i++) { subTabBtns[i].classList.remove('active'); }
        btn.classList.add('active');
        document.getElementById('admin-subtab-escrows').classList.toggle('is-hidden', activePaymentSubTab !== 'escrows');
        document.getElementById('admin-subtab-all-tx').classList.toggle('is-hidden', activePaymentSubTab !== 'all-tx');
        document.getElementById('admin-subtab-bookings').classList.toggle('is-hidden', activePaymentSubTab !== 'bookings');
        if (activePaymentSubTab === 'all-tx')   renderAllTx();
        if (activePaymentSubTab === 'escrows')  renderEscrows();
        if (activePaymentSubTab === 'bookings') renderBookings();
      });
    })(subTabBtns[st]);
  }

  /* ── All-TX filters ── */
  var txTypeChips = document.querySelectorAll('[data-tx-type]');
  for (var tc = 0; tc < txTypeChips.length; tc++) {
    (function(chip) {
      chip.addEventListener('click', function() {
        _allTxFilters.type = chip.dataset.txType;
        txTypeChips.forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        renderAllTx();
      });
    })(txTypeChips[tc]);
  }
  var alltxFrom = document.getElementById('alltx-from');
  var alltxTo   = document.getElementById('alltx-to');
  if (alltxFrom) alltxFrom.addEventListener('change', function() { _allTxFilters.dateFrom = alltxFrom.value; renderAllTx(); });
  if (alltxTo)   alltxTo.addEventListener('change',   function() { _allTxFilters.dateTo   = alltxTo.value;   renderAllTx(); });
  /* Teacher/student dropdowns handled by _buildPartyDropdown inside _populateAllTxDropdowns */
  var alltxRefresh = document.getElementById('alltx-refresh-btn');
  if (alltxRefresh) alltxRefresh.addEventListener('click', renderAllTx);
  var alltxReset = document.getElementById('alltx-reset');
  if (alltxReset) alltxReset.addEventListener('click', function() {
    _allTxFilters = { type: 'all', dateFrom: '', dateTo: '', teacher: 'all', student: 'all' };
    if (alltxFrom) alltxFrom.value = '';
    if (alltxTo)   alltxTo.value   = '';
    var tLbl = document.getElementById('alltx-teacher-label'); if (tLbl) tLbl.textContent = 'Alle Lehrer';
    var sLbl = document.getElementById('alltx-student-label'); if (sLbl) sLbl.textContent = 'Alle Schüler';
    ['alltx-teacher-list','alltx-student-list'].forEach(function(lid) {
      var ul = document.getElementById(lid);
      if (ul) ul.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
        el.classList.toggle('is-active', el.getAttribute('data-value') === 'all');
      });
    });
    txTypeChips.forEach(function(c) { c.classList.remove('active'); });
    var allChip = document.querySelector('[data-tx-type="all"]');
    if (allChip) allChip.classList.add('active');
    renderAllTx();
  });
  /* Populate teacher/student dropdowns */
  _populateAllTxDropdowns();
  _initBookingsFilters();

  /* ── Financial Summary ── */
  renderFinSummary();
  var finRefresh = document.getElementById('fin-refresh-btn');
  if (finRefresh) finRefresh.addEventListener('click', renderFinSummary);

  /* ── Disziplin-Gruppe toggle ── */
  _bindAdminDropdowns();

  var createForm = document.getElementById('create-form');
  if (createForm) createForm.addEventListener('submit', handleCreate);

  renderStats();
  renderTable();
  } /* end _initAdmin */
  if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
    CurrencyService.onReady(_initAdmin);
  } else {
    _initAdmin();
  }
});

/* ── Custom Dropdown Binding (Admin) ──────────────────── */
function _bindAdminDropdowns() {
  var dropdowns = document.querySelectorAll('.custom-dropdown[data-dropdown-id]');

  function _closeAll(except) {
    var open = document.querySelectorAll('.custom-dropdown-trigger.is-open');
    for (var i = 0; i < open.length; i++) {
      if (open[i] === except) continue;
      open[i].classList.remove('is-open');
      open[i].setAttribute('aria-expanded', 'false');
      var ddId = open[i].getAttribute('data-dropdown-trigger');
      var lst  = document.querySelector('[data-dropdown-list="' + ddId + '"]');
      if (lst) lst.classList.remove('is-open');
    }
  }

  for (var d = 0; d < dropdowns.length; d++) {
    (function(dd) {
      var ddId    = dd.getAttribute('data-dropdown-id');
      var trigger = dd.querySelector('.custom-dropdown-trigger');
      var list    = dd.querySelector('.custom-dropdown-list');
      var label   = dd.querySelector('.custom-dropdown-label');
      if (!trigger || !list || !label) return;

      /* Init value */
      dd.setAttribute('data-dropdown-value', '');

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
            var allItems = list.querySelectorAll('.custom-dropdown-item');
            for (var j = 0; j < allItems.length; j++) {
              allItems[j].classList.remove('is-active');
              allItems[j].setAttribute('aria-selected', 'false');
            }
            item.classList.add('is-active');
            item.setAttribute('aria-selected', 'true');
            label.textContent = item.textContent;
            dd.setAttribute('data-dropdown-value', val || '');
            trigger.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
            list.classList.remove('is-open');

            /* Disziplin-Gruppe ein-/ausblenden wenn Rolle gewählt */
            if (ddId === 'f-role') {
              var grp = document.getElementById('discipline-group');
              if (grp) grp.classList.toggle('is-hidden', val !== 'teacher');
              if (val !== 'teacher') {
                var discDd = document.getElementById('dd-discipline');
                if (discDd) {
                  discDd.setAttribute('data-dropdown-value', '');
                  var discLabel = discDd.querySelector('.custom-dropdown-label');
                  if (discLabel) discLabel.textContent = 'Fachbereich wählen…';
                  var discItems = discDd.querySelectorAll('.custom-dropdown-item');
                  for (var k = 0; k < discItems.length; k++) {
                    discItems[k].classList.remove('is-active');
                    discItems[k].setAttribute('aria-selected', 'false');
                  }
                }
              }
            }
          });
        })(items[i]);
      }
    })(dropdowns[d]);
  }

  document.addEventListener('click', function(e) {
    /* Nur schließen wenn Klick außerhalb aller Dropdowns */
    var target = e.target;
    while (target && target !== document) {
      if (target.classList && target.classList.contains('custom-dropdown')) return;
      target = target.parentNode;
    }
    _closeAll(null);
  });
}

function _getAdminDropdownVal(id) {
  var dd = document.querySelector('[data-dropdown-id="' + id + '"]');
  return dd ? (dd.getAttribute('data-dropdown-value') || '') : '';
}

function _resetAdminDropdown(id, placeholder) {
  var dd = document.querySelector('[data-dropdown-id="' + id + '"]');
  if (!dd) return;
  dd.setAttribute('data-dropdown-value', '');
  var lbl = dd.querySelector('.custom-dropdown-label');
  if (lbl) lbl.textContent = placeholder;
  var items = dd.querySelectorAll('.custom-dropdown-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.remove('is-active');
    items[i].setAttribute('aria-selected', 'false');
  }
}

/* ── CREATE ───────────────────────────────────────────── */
function handleCreate(e) {
  e.preventDefault();
  var uid        = document.getElementById('f-uid').value.trim();
  var name       = document.getElementById('f-name').value.trim();
  var email      = document.getElementById('f-email') ? document.getElementById('f-email').value.trim() : '';
  var role       = _getAdminDropdownVal('f-role');
  var password   = document.getElementById('f-password') ? document.getElementById('f-password').value : '';
  var discipline = role === 'teacher' ? _getAdminDropdownVal('f-discipline') : '';

  _clearErrors();
  var valid = true;
  if (!uid)  { _showError('e-uid',  'UID ist erforderlich.');  valid = false; }
  if (!name) { _showError('e-name', 'Name ist erforderlich.'); valid = false; }
  if (!role) { _showError('e-role', 'Rolle wählen.');          valid = false; }
  if (!valid) return;

  AppService.createUser({
    uid: uid, name: name, role: role,
    email: email, discipline: discipline, password: password
  }, function(err, newUser) {
    if (err) { Toast.error(err.message); return; }
    var roleLabel = role === 'teacher' ? 'Lehrer' : 'Schüler';
    Toast.success(roleLabel + ' <strong>' + (newUser ? newUser.name : name) + '</strong> erstellt.');
    e.target.reset();
    /* Dropdowns zurücksetzen */
    _resetAdminDropdown('f-role', 'Rolle wählen…');
    _resetAdminDropdown('f-discipline', 'Fachbereich wählen…');
    var grp = document.getElementById('discipline-group');
    if (grp) grp.classList.add('is-hidden');
    /* Tabelle auf neue Rolle wechseln */
    activeTab = role;
    var tabBtns = document.querySelectorAll('.segmented-btn');
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].classList.toggle('active', tabBtns[i].dataset.tab === role);
    }
    renderStats();
    renderTable();
  });
}

/* ── EDIT ─────────────────────────────────────────────── */
var _DISC_OPTIONS = [
  { value: '',           label: 'Kein Fachbereich' },
  { value: 'ski',        label: 'Ski-Instruktor' },
  { value: 'snowboard',  label: 'Snowboard-Instruktor' },
  { value: 'paragliding',label: 'Paragliding-Instruktor' },
  { value: 'climbing',   label: 'Kletter-Instruktor' },
  { value: 'diving',     label: 'Tauch-Instruktor' }
];

function _buildDiscDropdownHTML(currentVal) {
  var currentLabel = 'Fachbereich wählen\u2026';
  var items = '';
  for (var i = 0; i < _DISC_OPTIONS.length; i++) {
    var o = _DISC_OPTIONS[i];
    var isActive = (o.value === currentVal);
    if (isActive) currentLabel = o.label;
    items +=
      '<li class="custom-dropdown-item' + (isActive ? ' is-active' : '') + '"' +
        ' role="option"' +
        ' data-value="' + o.value + '"' +
        ' aria-selected="' + isActive + '">' +
        o.label +
      '</li>';
  }
  return (
    '<div class="custom-dropdown" id="edit-dd-discipline" data-dropdown-id="edit-discipline" data-dropdown-value="' + (currentVal || '') + '">' +
      '<button type="button" class="custom-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false" data-dropdown-trigger="edit-discipline">' +
        '<span class="custom-dropdown-label" data-dropdown-label="edit-discipline">' + currentLabel + '</span>' +
        '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">' +
          '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +
      '<ul class="custom-dropdown-list" role="listbox" data-dropdown-list="edit-discipline">' +
        items +
      '</ul>' +
    '</div>'
  );
}

function _bindEditDiscDropdown() {
  var dd      = document.getElementById('edit-dd-discipline');
  if (!dd) return;
  var trigger = dd.querySelector('.custom-dropdown-trigger');
  var list    = dd.querySelector('.custom-dropdown-list');
  var label   = dd.querySelector('.custom-dropdown-label');
  if (!trigger || !list || !label) return;

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = trigger.classList.contains('is-open');
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
        var allItems = list.querySelectorAll('.custom-dropdown-item');
        for (var j = 0; j < allItems.length; j++) {
          allItems[j].classList.remove('is-active');
          allItems[j].setAttribute('aria-selected', 'false');
        }
        item.classList.add('is-active');
        item.setAttribute('aria-selected', 'true');
        label.textContent = item.textContent;
        dd.setAttribute('data-dropdown-value', val || '');
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.remove('is-open');
      });
    })(items[i]);
  }

  /* Close on outside click */
  document.addEventListener('click', function _editDiscClose(e) {
    if (!dd.contains(e.target)) {
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      list.classList.remove('is-open');
    }
  });
}

function handleEdit(uid) {
  var user = AppService.getUserSync(uid);
  if (!user) return;

  var isTeacher   = (user.role === 'teacher');
  var currentDisc = user.discipline || '';

  var bodyHTML =
    '<div class="form-stack">' +
      '<div class="form-group">' +
        '<label class="form-label" for="edit-name">Name</label>' +
        '<input class="form-input" id="edit-name" type="text" value="' + _esc(user.name || '') + '" />' +
        '<span class="form-error-msg is-hidden" id="edit-e-name"></span>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="edit-email">E-Mail</label>' +
        '<input class="form-input" id="edit-email" type="email" value="' + _esc(user.email || '') + '" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="edit-password">Neues Passwort <span style="color:var(--neutral-400);font-weight:400">(leer = unverändert)</span></label>' +
        '<input class="form-input" id="edit-password" type="password" autocomplete="new-password" />' +
      '</div>' +
      (isTeacher
        ? '<div class="form-group">' +
            '<label class="form-label">Fachbereich</label>' +
            _buildDiscDropdownHTML(currentDisc) +
          '</div>'
        : '') +
      '<div class="form-group">' +
        '<label class="form-label" for="edit-username">Benutzername</label>' +
        '<div class="auth-username-wrap">' +
          '<span class="auth-username-prefix">@</span>' +
          '<input class="form-input auth-username-input" id="edit-username" type="text" value="' + _esc(user.username || '') + '" autocomplete="username" />' +
        '</div>' +
        '<span class="form-error-msg is-hidden" id="edit-e-username"></span>' +
      '</div>' +
    '</div>';

  var result = Modal.show({
    title:      'Benutzer bearbeiten \u2014 ' + uid,
    bodyHTML:   bodyHTML,
    footerHTML:
      '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>' +
      '<button class="btn btn-primary" id="modal-save">Speichern</button>'
  });

  /* Bind custom dropdown after Modal has injected HTML into the DOM */
  if (isTeacher) _bindEditDiscDropdown();

  document.getElementById('modal-cancel').addEventListener('click', result.close);

  document.getElementById('modal-save').addEventListener('click', function() {
    var newName  = document.getElementById('edit-name').value.trim();
    var newEmail = document.getElementById('edit-email').value.trim();
    var newPw    = document.getElementById('edit-password').value;
    var newUsername = (document.getElementById('edit-username') ? document.getElementById('edit-username').value : '').trim().toLowerCase().replace(/^@/, '');
    var newDisc  = '';
    if (isTeacher) {
      var dd = document.getElementById('edit-dd-discipline');
      newDisc = dd ? (dd.getAttribute('data-dropdown-value') || '') : '';
    }

    var errEl = document.getElementById('edit-e-name');
    if (!newName) {
      if (errEl) { errEl.textContent = 'Name ist erforderlich.'; errEl.classList.remove('is-hidden'); }
      return;
    }
    if (errEl) errEl.classList.add('is-hidden');

    AppService.updateUser(uid, { name: newName, email: newEmail, discipline: newDisc, password: newPw, username: newUsername }, function(err) {
      if (err) { Toast.error(err.message); return; }
      Toast.success('Benutzer <strong>' + _esc(newName) + '</strong> aktualisiert.');
      renderStats();
      renderTable();
      result.close();
    });
  });
}

/* ── DELETE ───────────────────────────────────────────── */
function handleDelete(uid) {
  var user = AppService.getUserSync(uid);
  if (!user) return;

  var displayName = ProfileStore.getDisplayName(user.uid);
  var result = Modal.show({
    title: 'Benutzer löschen',
    bodyHTML:
      '<p><strong>' + displayName + '</strong> (' + uid + ') wirklich löschen?</p>' +
      '<p class="text-muted">Alle Buchungen und Auswahlen werden ebenfalls entfernt.</p>',
    footerHTML:
      '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>' +
      '<button class="btn btn-danger" id="modal-confirm">Löschen</button>'
  });

  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    AppService.deleteUser(uid, function(err) {
      if (err) { Toast.error(err.message); result.close(); return; }
      Toast.success('Benutzer <strong>' + displayName + '</strong> gelöscht.');
      renderStats();
      renderTable();
      result.close();
    });
  });
}

/* ── STATS ────────────────────────────────────────────── */
/* ════════════════════════════════════════════════════
   FINANCIAL SUMMARY PANEL
════════════════════════════════════════════════════ */
function renderFinSummary() {
  var today = new Date().toISOString().slice(0, 10);

  function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function _fmt(n) { return parseFloat(n || 0).toFixed(2).replace('.', ',') + ' €'; }

  /* Load all data in parallel */
  var slots    = null;
  var escrows  = null;
  var wallets  = null;
  var txs      = null;
  var pending  = 4;

  function _check() {
    if (--pending > 0) return;
    _computeFinSummary(slots, escrows, wallets, txs, today, _fmt, _set);
  }

  AppService.getAllSlots(function(err, data)        { slots   = data || []; _check(); });
  AppService.getAllEscrows(function(err, data)      { escrows = data || []; _check(); });
  AppService.getAllTransactions({}, function(err, data) { txs = data || []; _check(); });

  /* Wallets — via AppService.getAllWallets */
  AppService.getAllWallets(function(err, data) {
    wallets = (!err && data) ? data : {};
    _check();
  });
}

function _computeFinSummary(slots, escrows, wallets, txs, today, _fmt, _set) {

  /* ── 1. Bestätigt & ausgezahlt ──────────────────────
     Slots confirmed + escrow released → full payment received by teacher */
  var confirmedSlots = slots.filter(function(s) { return s.status === 'confirmed'; });
  var confirmedRevenue = 0;
  confirmedSlots.forEach(function(s) { confirmedRevenue += parseFloat(s.price) || 0; });
  _set('fin-confirmed-val', _fmt(confirmedRevenue));
  _set('fin-confirmed-sub', confirmedSlots.length + ' Stunden');

  /* ── 2. Deposit gehalten ─────────────────────────────
     Escrows with depositStatus=held → money held in escrow */
  var heldEscrows = escrows.filter(function(e) { return e.depositStatus === 'held'; });
  var heldTotal = 0;
  heldEscrows.forEach(function(e) { heldTotal += parseFloat(e.depositAmount) || 0; });
  _set('fin-held-val', _fmt(heldTotal));
  _set('fin-held-sub', heldEscrows.length + ' Slots');

  /* ── 3. Fällig bei Bestätigung ───────────────────────
     For each held escrow on an unconfirmed slot: fullAmount - depositAmount
     = what teacher receives when student confirms */
  var pendingConfirmAmount = 0;
  var pendingConfirmCount  = 0;
  var escrowBySlot = {};
  escrows.forEach(function(e) { escrowBySlot[e.slotId] = e; });
  slots.forEach(function(s) {
    if (s.status !== 'booked') return;
    var e = escrowBySlot[s.slotId];
    if (!e || e.depositStatus !== 'held') return;
    var remaining = (parseFloat(e.fullAmount) || 0) - (parseFloat(e.depositAmount) || 0);
    if (remaining > 0) { pendingConfirmAmount += remaining; pendingConfirmCount++; }
  });
  _set('fin-pending-val', _fmt(pendingConfirmAmount));
  _set('fin-pending-sub', pendingConfirmCount + ' Slots');

  /* ── 4. Geplanter Umsatz (future slots) ─────────────
     All booked+confirmed slots with date >= today */
  var futureSlots = slots.filter(function(s) {
    return (s.status === 'booked' || s.status === 'confirmed') && s.date >= today;
  });
  var futureRevenue = 0;
  futureSlots.forEach(function(s) { futureRevenue += parseFloat(s.price) || 0; });
  _set('fin-future-val', _fmt(futureRevenue));
  _set('fin-future-sub', futureSlots.length + ' zukünftige Slots');

  /* ── 5. Wallet Gesamtguthaben ────────────────────────
     Sum of all user wallet balances */
  var walletTotal = 0;
  var walletCount = 0;
  if (wallets && typeof wallets === 'object') {
    Object.keys(wallets).forEach(function(uid) {
      walletTotal += parseFloat(wallets[uid].balance) || 0;
      walletCount++;
    });
  }
  _set('fin-wallet-val', _fmt(walletTotal));
  _set('fin-wallet-sub', walletCount + ' Benutzer');

  /* ── 6. Ausstehende Refunds ──────────────────────────
     Escrows with depositStatus=refund_requested */
  var refundEscrows = escrows.filter(function(e) {
    return e.depositStatus === 'refund_requested';
  });
  var refundTotal = 0;
  refundEscrows.forEach(function(e) { refundTotal += parseFloat(e.depositAmount) || 0; });
  _set('fin-refund-val', _fmt(refundTotal));
  _set('fin-refund-sub', refundEscrows.length + (refundEscrows.length === 1 ? ' offen' : ' offen'));
}

function renderStats() {
  var teachers = AppService.getUsersByRoleSync('teacher').length;
  var students = AppService.getUsersByRoleSync('student').length;
  var bookings = AppService.getAllSlotsSync().filter(function(s) { return s.status === 'booked'; }).length;
  document.getElementById('stat-teachers').textContent = teachers;
  document.getElementById('stat-students').textContent = students;
  document.getElementById('stat-bookings').textContent = bookings;

  /* Offene Escrows zählen — via AppService (kein direkter localStorage-Zugriff) */
  AppService.getAllEscrows(function(err, escrows) {
    if (err || !escrows) return;
    var open = escrows.filter(function(e) {
      return e.depositStatus === 'held' || e.depositStatus === 'refund_requested';
    }).length;
    var el = document.getElementById('stat-escrows');
    if (el) el.textContent = open;
  });
}

/* ── TABLE ────────────────────────────────────────────── */
function renderTable() {
  var users = AppService.getUsersByRoleSync(activeTab);
  var tbody = document.getElementById('user-tbody');

  /* ── Search input above table — mockup-adminRenderTable-2026-03-23_20-55 ── */
  var tableWrap = tbody ? tbody.closest('table') : null;
  var searchId  = 'admin-user-search';
  if (tableWrap && tableWrap.parentNode && !document.getElementById(searchId)) {
    var searchDiv = document.createElement('div');
    searchDiv.innerHTML = buildSearchInput(searchId, 'Benutzer suchen…');
    tableWrap.parentNode.insertBefore(searchDiv.firstChild, tableWrap);
  }

  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="table-empty-cell">Noch keine ' +
      (activeTab === 'teacher' ? 'Lehrer' : 'Schüler') +
      ' vorhanden.</td></tr>';
    return;
  }

  var rows = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var bookingCount = activeTab === 'teacher'
      ? AppService.getSlotsByTeacherSync(u.uid).length
      : AppService.getSlotsByStudentSync(u.uid).length;
    var selCount = activeTab === 'teacher'
      ? AppService.getSelectionsByTeacherSync(u.uid).length
      : AppService.getSelectionsByStudentSync(u.uid).length;

    var discBadge = (activeTab === 'teacher' && u.discipline)
      ? '<span class="admin-discipline-badge">' + _esc(_disciplineLabel(u.discipline)) + '</span>'
      : '';

    var emailBadge = u.email
      ? '<span class="admin-email-badge">' + _esc(u.email) + '</span>'
      : '';

    var infoText = activeTab === 'teacher'
      ? selCount + ' Schüler · ' + bookingCount + ' Slots'
      : selCount + ' Lehrer · ' + bookingCount + ' Buchungen';

    rows +=
      '<tr>' +
      '<td><code class="uid-badge">' + _esc(u.uid) + '</code></td>' +
      '<td class="td-name">' +
        '<span class="admin-user-name">' + _esc(ProfileStore.getDisplayName(u.uid)) + '</span>' +
        (discBadge ? '<br>' + discBadge : '') +
        (u.email ? '<br><span class="admin-email-badge">' + _esc(u.email) + '</span>' : '') +
      '</td>' +
      '<td class="td-meta">' + infoText + '</td>' +
      '<td class="admin-actions">' +
        '<a href="./user-detail.html?uid=' + _esc(u.uid) + '" class="btn btn-secondary btn-sm">' +
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
            '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>' +
            '<path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          '</svg>' +
          ' Detail' +
        '</a>' +
        '<button class="btn btn-secondary btn-sm" onclick="handleEdit(\'' + _esc(u.uid) + '\')">' +
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
            '<path d="M11.5 2.5a2 2 0 012.8 2.8L5 14.5l-4 1 1-4 9.5-9z"' +
            ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          ' Bearbeiten' +
        '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="handleDelete(\'' + _esc(u.uid) + '\')">' +
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
            '<path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4"' +
            ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          ' Löschen' +
        '</button>' +
      '</td>' +
      '</tr>';
  }
  tbody.innerHTML = rows;
}

/* ── ESCROW PANEL ─────────────────────────────────────── */
/* ── Populate teacher/student dropdowns from user list ── */
function _buildPartyDropdown(listId, triggerId, labelId, defaultLabel, filterKey, filterObj, onChangeCb) {
  var list    = document.getElementById(listId);
  var trigger = document.getElementById(triggerId);
  var label   = document.getElementById(labelId);
  if (!list || !trigger || !label) return;

  function setVal(val, txt) {
    var fObj = filterObj || _allTxFilters;
    fObj[filterKey] = val;
    label.textContent = txt;
    list.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
      el.classList.toggle('is-active', el.getAttribute('data-value') === val);
    });
    list.classList.remove('is-open');
    trigger.classList.remove('is-open');
    if (onChangeCb) onChangeCb(); else renderAllTx();
  }

  function addItem(val, txt) {
    var li = document.createElement('li');
    li.className = 'custom-dropdown-item' + (val === 'all' ? ' is-active' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('data-value', val);
    li.textContent = txt;
    li.addEventListener('click', function() { setVal(val, txt); });
    list.appendChild(li);
  }

  addItem('all', defaultLabel);

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    list.classList.toggle('is-open');
    trigger.classList.toggle('is-open');
  });
  document.addEventListener('click', function() {
    list.classList.remove('is-open');
    trigger.classList.remove('is-open');
  });

  return { addItem: addItem, setVal: setVal };
}

function _populateAllTxDropdowns() {
  var teacherDD = _buildPartyDropdown('alltx-teacher-list','alltx-teacher-trigger','alltx-teacher-label','Alle Lehrer','teacher', _allTxFilters, renderAllTx);
  var studentDD = _buildPartyDropdown('alltx-student-list','alltx-student-trigger','alltx-student-label','Alle Schüler','student', _allTxFilters, renderAllTx);

  AppService.getAllUsers(function(err, users) {
    if (err || !users) return;
    users.forEach(function(u) {
      var name = ProfileStore.getDisplayName(u.uid) || u.name || u.uid;
      if (u.role === 'teacher' && teacherDD) teacherDD.addItem(u.uid, name);
      if (u.role === 'student' && studentDD) studentDD.addItem(u.uid, name);
      /* Also populate bookings dropdowns */
      var bkTDD = document.getElementById('bk-teacher-list');
      var bkSDD = document.getElementById('bk-student-list');
      if (u.role === 'teacher' && bkTDD) {
        var li1 = document.createElement('li');
        li1.className = 'custom-dropdown-item';
        li1.setAttribute('role', 'option');
        li1.setAttribute('data-value', u.uid);
        li1.textContent = name;
        li1.addEventListener('click', function() {
          _bkFilters.teacher = u.uid;
          document.getElementById('bk-teacher-label').textContent = name;
          bkTDD.querySelectorAll('.custom-dropdown-item').forEach(function(el) { el.classList.toggle('is-active', el.getAttribute('data-value') === u.uid); });
          bkTDD.classList.remove('is-open');
          document.getElementById('bk-teacher-trigger').classList.remove('is-open');
          renderBookings();
        });
        bkTDD.appendChild(li1);
      }
      if (u.role === 'student' && bkSDD) {
        var li2 = document.createElement('li');
        li2.className = 'custom-dropdown-item';
        li2.setAttribute('role', 'option');
        li2.setAttribute('data-value', u.uid);
        li2.textContent = name;
        li2.addEventListener('click', function() {
          _bkFilters.student = u.uid;
          document.getElementById('bk-student-label').textContent = name;
          bkSDD.querySelectorAll('.custom-dropdown-item').forEach(function(el) { el.classList.toggle('is-active', el.getAttribute('data-value') === u.uid); });
          bkSDD.classList.remove('is-open');
          document.getElementById('bk-student-trigger').classList.remove('is-open');
          renderBookings();
        });
        bkSDD.appendChild(li2);
      }
    });
  });
}

/* ── Bookings Overview ──────────────────────────────── */
function _initBookingsFilters() {
  /* Status chips */
  var statusChips = document.querySelectorAll('[data-booking-status]');
  for (var sc = 0; sc < statusChips.length; sc++) {
    (function(chip) {
      chip.addEventListener('click', function() {
        _bkFilters.status = chip.dataset.bookingStatus;
        statusChips.forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        renderBookings();
      });
    })(statusChips[sc]);
  }
  /* Date filters */
  var bkFrom = document.getElementById('bk-from');
  var bkTo   = document.getElementById('bk-to');
  if (bkFrom) bkFrom.addEventListener('change', function() { _bkFilters.dateFrom = bkFrom.value; renderBookings(); });
  if (bkTo)   bkTo.addEventListener('change',   function() { _bkFilters.dateTo   = bkTo.value;   renderBookings(); });
  /* Teacher/student dropdowns */
  _buildPartyDropdown('bk-teacher-list','bk-teacher-trigger','bk-teacher-label','Alle Lehrer','teacher', _bkFilters, renderBookings);
  _buildPartyDropdown('bk-student-list','bk-student-trigger','bk-student-label','Alle Schüler','student', _bkFilters, renderBookings);
  /* Refresh + reset */
  var bkRefresh = document.getElementById('bookings-refresh-btn');
  if (bkRefresh) bkRefresh.addEventListener('click', renderBookings);
  var bkReset = document.getElementById('bk-reset');
  if (bkReset) bkReset.addEventListener('click', function() {
    _bkFilters = { status: 'all', teacher: 'all', student: 'all', dateFrom: '', dateTo: '' };
    if (bkFrom) bkFrom.value = ''; if (bkTo) bkTo.value = '';
    statusChips.forEach(function(c) { c.classList.remove('active'); });
    var allChip = document.querySelector('[data-booking-status="all"]');
    if (allChip) allChip.classList.add('active');
    var tLbl2 = document.getElementById('bk-teacher-label'); if (tLbl2) tLbl2.textContent = 'Alle Lehrer';
    var sLbl2 = document.getElementById('bk-student-label'); if (sLbl2) sLbl2.textContent = 'Alle Schüler';
    ['bk-teacher-list','bk-student-list'].forEach(function(lid) {
      var ul = document.getElementById(lid);
      if (ul) ul.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
        el.classList.toggle('is-active', el.getAttribute('data-value') === 'all');
      });
    });
    bkReset.classList.add('is-hidden');
    renderBookings();
  });
}

function renderBookings() {
  var list  = document.getElementById('bk-list');
  var empty = document.getElementById('bk-empty');
  var count = document.getElementById('bk-count');
  var vol   = document.getElementById('bk-volume');
  var reset = document.getElementById('bk-reset');
  if (!list) return;

  AppService.getAllSlots(function(err, slots) {
    if (err) { list.innerHTML = '<li class="wallet-history-empty">Fehler: ' + (err.message || err) + '</li>'; return; }
    var f = _bkFilters;
    /* Filter to booked/confirmed only, then apply user filters */
    var booked = (slots || []).filter(function(s) {
      if (s.status !== 'booked' && s.status !== 'confirmed') return false;
      if (f.status !== 'all' && s.status !== f.status) return false;
      if (f.teacher !== 'all' && s.teacherId !== f.teacher) return false;
      if (f.student !== 'all' && s.studentId !== f.student) return false;
      if (f.dateFrom && s.date < f.dateFrom) return false;
      if (f.dateTo   && s.date > f.dateTo)   return false;
      return true;
    });
    /* Sort newest bookedAt first */
    booked.sort(function(a, b) { return (b.bookedAt || b.date || '').localeCompare(a.bookedAt || a.date || ''); });

    /* Summary */
    var totalRevenue = 0;
    booked.forEach(function(s) { totalRevenue += parseFloat(s.price) || 0; });
    if (count) count.textContent = booked.length + ' Buchung' + (booked.length !== 1 ? 'en' : '');
    if (vol)   vol.textContent   = 'Gesamtwert: ' + totalRevenue.toFixed(2).replace('.', ',') + ' €';
    var isFiltered = f.status !== 'all' || f.teacher !== 'all' || f.student !== 'all' || f.dateFrom || f.dateTo;
    if (reset) { if (isFiltered) { reset.classList.remove('is-hidden'); } else { reset.classList.add('is-hidden'); } }

    /* Clear and render */
    list.querySelectorAll('.wallet-tx-item').forEach(function(el) { el.remove(); });
    if (!booked.length) { if (empty) empty.classList.remove('is-hidden'); return; }
    if (empty) empty.classList.add('is-hidden');

    var fmtDate = function(d) {
      if (!d) return '—';
      var obj = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
      return obj.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    };
    var fmtDt = function(iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
        + ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
    };

    booked.forEach(function(slot) {
      var isConfirmed = slot.status === 'confirmed';
      var tName = ProfileStore.getDisplayName(slot.teacherId) || slot.teacherId || '—';
      var sName = ProfileStore.getDisplayName(slot.studentId) || slot.studentId || '—';
      var price = slot.price ? slot.price.toFixed(2).replace('.', ',') + ' €' : '—';
      var endTime = _tAdminEndTime(slot.time, slot.date, slot.teacherId);
      var _adminLocalTime = _tAdminTime(slot.time, slot.date, slot.teacherId);
      var li = document.createElement('li');
      li.className = 'wallet-tx-item admin-tx-row';
      li.innerHTML =
        '<div class="wallet-tx-icon ' + (isConfirmed ? 'lesson_confirmed' : 'booking') + '" aria-hidden="true">'
          + (isConfirmed ? '★' : '✓') + '</div>' +
        '<div class="wallet-tx-body">' +
          '<div class="wallet-tx-row1">' +
            '<span class="wallet-tx-type">'
              + '<span class="alltx-owner">' + _esc(tName) + '</span>'
              + ' &larr; ' + _esc(sName) +
            '</span>' +
            '<span class="wallet-tx-amount positive">' + _esc(price) + '</span>' +
          '</div>' +
          '<div class="wallet-tx-row2">' +
            '<span class="wallet-tx-date">' + fmtDate(slot.date) + ' ' + _esc(_adminLocalTime || '') + (endTime ? '&ndash;' + _esc(endTime) : '') + '</span>' +
            '<span class="wallet-tx-balance">' + (isConfirmed
              ? '<span class="status-confirmed">✓ Bestätigt</span>'
              : '<span style="color:#d97706;font-weight:700">⏳ Unbestätigt</span>') + '</span>' +
          '</div>' +
          '<div class="wallet-tx-desc">Gebucht: ' + fmtDt(slot.bookedAt) +
            (slot.bookedByRole ? ' &bull; durch ' + (slot.bookedByRole === 'teacher' ? 'Lehrer' : 'Schüler') : '') +
            (slot.confirmedAt ? ' &bull; Bestätigt: ' + fmtDt(slot.confirmedAt) : '') +
          '</div>' +
        '</div>';
      (function(row, s) {
        row.addEventListener('click', function() { _showBookingDetail(s); });
      })(li, slot);
      list.appendChild(li);
    });
  });
}

function _showBookingDetail(slot) {
  var tName   = ProfileStore.getDisplayName(slot.teacherId) || slot.teacherId || '—';
  var sName   = ProfileStore.getDisplayName(slot.studentId) || slot.studentId || '—';
  var endTime = AppService.slotEndTime ? AppService.slotEndTime(slot.time) : '';
  var fmtDt   = function(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })
      + ', ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
  };
  var fmt = function(n) { return n ? parseFloat(n).toFixed(2).replace('.', ',') + ' €' : '—'; };
  var rows = [
    ['Lehrer',        tName],
    ['Schüler',       sName],
    ['Datum',         slot.date || '—'],
    ['Uhrzeit',       (_adminDetailTime || '—') + (endTime ? ' – ' + endTime : '')],
    ['Status',        slot.status === 'confirmed' ? '✓ Bestätigt' : '⏳ Unbestätigt'],
    ['Preis',         fmt(slot.price)],
    ['Gebucht am',    fmtDt(slot.bookedAt)],
    ['Gebucht durch', slot.bookedByRole === 'teacher' ? 'Lehrer' : 'Schüler'],
    ['Bestätigt am',  fmtDt(slot.confirmedAt)],
    ['Slot-ID',       slot.slotId || '—'],
    ['Lehrer-UID',    slot.teacherId || '—'],
    ['Schüler-UID',   slot.studentId || '—']
  ];
  var bodyHTML = '<table class="admin-tx-detail-table">' +
    rows.map(function(r) {
      return '<tr><td class="atd-key">' + _esc(r[0]) + '</td><td class="atd-val">' + _esc(String(r[1])) + '</td></tr>';
    }).join('') + '</table>';
  var result = Modal.show({ title: 'Buchungsdetails', bodyHTML: bodyHTML,
    footerHTML: '<button class="btn btn-ghost" id="bkd-close">Schließen</button>' });
  document.getElementById('bkd-close').addEventListener('click', result.close);
}

/* ── Render all transactions ───────────────────────── */
function renderAllTx() {
  var list  = document.getElementById('alltx-list');
  var empty = document.getElementById('alltx-empty');
  var count = document.getElementById('alltx-count');
  var vol   = document.getElementById('alltx-volume');
  var reset = document.getElementById('alltx-reset');
  if (!list) return;

  /* Build opts for getAllTransactions */
  var f    = _allTxFilters;
  var opts = {};
  if (f.type && f.type !== 'all') {
    opts.types = (f.type === 'cancellation')
      ? ['cancellation', 'teacher_cancel'] : [f.type];
  }
  if (f.dateFrom) opts.dateFrom = f.dateFrom + 'T00:00:00.000Z';
  if (f.dateTo)   opts.dateTo   = f.dateTo   + 'T23:59:59.999Z';

  AppService.getAllTransactions(opts, function(err, txs) {
    if (err) { list.innerHTML = '<li class="wallet-history-empty">Fehler: ' + (err.message || String(err)) + '</li>'; return; }
    txs = txs || [];

    /* Client-side party filter */
    if (f.teacher && f.teacher !== 'all') {
      txs = txs.filter(function(t) {
        return t.uid === f.teacher || t.relatedUid === f.teacher
          || (t.meta && t.meta.teacherId === f.teacher);
      });
    }
    if (f.student && f.student !== 'all') {
      txs = txs.filter(function(t) {
        return t.uid === f.student || t.relatedUid === f.student
          || (t.meta && t.meta.studentId === f.student);
      });
    }

    /* Sort newest first */
    txs.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });

    /* Summary */
    var totalVol = 0;
    txs.forEach(function(t) { totalVol += Math.abs(parseFloat(t.amount) || 0); });
    if (count) count.textContent = txs.length + ' Transaktionen';
    if (vol)   vol.textContent   = 'Volumen: ' + totalVol.toFixed(2).replace('.', ',') + ' €';
    var isFiltered = f.type !== 'all' || f.dateFrom || f.dateTo || f.teacher !== 'all' || f.student !== 'all';
    if (reset) { if (isFiltered) { reset.classList.remove('is-hidden'); } else { reset.classList.add('is-hidden'); } }

    /* Render */
    var items = list.querySelectorAll('.wallet-tx-item');
    for (var ri = 0; ri < items.length; ri++) items[ri].remove();

    if (!txs.length) {
      if (empty) empty.classList.remove('is-hidden');
      return;
    }
    if (empty) empty.classList.add('is-hidden');

    var TX_ICONS = { deposit:'↑', withdrawal:'↓', refund:'↩', cancellation:'✕',
      escrow_hold:'⏸', escrow_release:'▶', booking:'✓', move:'↔',
      teacher_cancel:'✕', lesson_confirmed:'★', transfer:'⇄' };
    var TX_LABELS = { deposit:'Einzahlung', withdrawal:'Auszahlung', refund:'Rückerstattung',
      cancellation:'Stornierung', teacher_cancel:'Lehrer-Stornierung',
      escrow_hold:'Deposit reserviert', escrow_release:'Zahlung freigegeben',
      booking:'Buchung', move:'Verschiebung', lesson_confirmed:'Stunde bestätigt',
      transfer:'Überweisung' };
    var fmtAmt = function(n) {
      var v = parseFloat(n) || 0;
      return (v >= 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + ' €';
    };
    var fmtDt = function(iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
        + ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
    };

    for (var ti = 0; ti < txs.length; ti++) {
      var tx  = txs[ti];
      var li  = document.createElement('li');
      li.className = 'wallet-tx-item admin-tx-row';
      var txType  = tx.type || 'deposit';
      var isPos   = (parseFloat(tx.amount) || 0) >= 0;
      var icon    = TX_ICONS[txType]  || '·';
      var label   = TX_LABELS[txType] || txType;
      var owner   = ProfileStore.getDisplayName(tx.uid) || tx.uid || '—';
      var related = tx.relatedUid ? (ProfileStore.getDisplayName(tx.relatedUid) || tx.relatedUid) : '';
      var balStr  = (parseFloat(tx.balance) || 0).toFixed(2).replace('.', ',') + ' €';
      li.innerHTML =
        '<div class="wallet-tx-icon ' + _esc(txType) + '" aria-hidden="true">' + icon + '</div>' +
        '<div class="wallet-tx-body">' +
          '<div class="wallet-tx-row1">' +
            '<span class="wallet-tx-type">' + _esc(label) + ' &mdash; <span class="alltx-owner">' + _esc(owner) + '</span></span>' +
            '<span class="wallet-tx-amount ' + (isPos ? 'positive' : 'negative') + '">' + _esc(fmtAmt(tx.amount)) + '</span>' +
          '</div>' +
          '<div class="wallet-tx-row2">' +
            '<span class="wallet-tx-date">' + fmtDt(tx.createdAt) + (related ? ' &bull; ' + _esc(related) : '') + '</span>' +
            '<span class="wallet-tx-balance">' + _esc(balStr) + '</span>' +
          '</div>' +
          (tx.description ? '<div class="wallet-tx-desc">' + _esc(tx.description.slice(0, 60)) + '</div>' : '') +
        '</div>';
      (function(row, t) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() { _showAdminTxDetail(t); });
      })(li, tx);
      list.appendChild(li);
    }
  });
}

/* ── Admin TX detail — delegates to WalletCore.showTxDetail ── */
function _showAdminTxDetail(tx) {
  if (typeof WalletCore !== 'undefined' && WalletCore.showTxDetail) {
    WalletCore.showTxDetail(tx, tx.uid);
    return;
  }
  /* Fallback: simple table if WalletCore not loaded */
  var fmt = function(n) { return (parseFloat(n) || 0).toFixed(2).replace('.', ',') + ' €'; };
  var rows = [
    ['Typ',        tx.type || '—'],
    ['TX-ID',      tx.txId || '—'],
    ['Betrag',     (parseFloat(tx.amount) >= 0 ? '+' : '') + fmt(tx.amount)],
    ['Kontostand', fmt(tx.balance)],
    ['Status',     tx.status || '—']
  ];
  var bodyHTML = '<table class="admin-tx-detail-table">' +
    rows.map(function(r) {
      return '<tr><td class="atd-key">' + _esc(r[0]) + '</td><td class="atd-val">' + _esc(String(r[1])) + '</td></tr>';
    }).join('') + '</table>';
  var result = Modal.show({ title: 'Transaktion', bodyHTML: bodyHTML,
    footerHTML: '<button class="btn btn-ghost" id="atd-close">Schließen</button>' });
  document.getElementById('atd-close').addEventListener('click', result.close);
}

function renderEscrows() {
  var container = document.getElementById('escrow-list');
  var empty     = document.getElementById('escrow-empty');
  if (!container) return;

  AppService.getAllEscrows(function(err, escrows) {
    if (err) { console.error('[Admin] Escrows:', err); return; }

    /* Sort newest first */
    escrows = escrows.slice().sort(function(a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    /* Filter */
    var filtered = escrows.filter(function(e) {
      if (activeEscrowFilter === 'held')     return e.depositStatus === 'held' || e.depositStatus === 'unpaid' || e.depositStatus === 'refund_requested';
      if (activeEscrowFilter === 'released') return e.depositStatus === 'released' || e.depositStatus === 'refunded' || e.depositStatus === 'forfeited';
      return true;
    });

    /* Update escrow counter — pending = held + refund_requested */
    var heldCount = escrows.filter(function(e) {
      return e.depositStatus === 'held' || e.depositStatus === 'refund_requested';
    }).length;
    var statEl = document.getElementById('stat-escrows');
    if (statEl) statEl.textContent = heldCount;

    /* Clear list */
    var items = container.querySelectorAll('.admin-escrow-row');
    for (var i = 0; i < items.length; i++) { items[i].remove(); }

    if (!filtered.length) {
      if (empty) empty.classList.remove('is-hidden');
      return;
    }
    if (empty) empty.classList.add('is-hidden');

    for (var j = 0; j < filtered.length; j++) {
      container.appendChild(_buildEscrowRow(filtered[j]));
    }
  });
}

var _ESCROW_STATUS = {
  unpaid:           { label: 'Nicht bezahlt',          cls: 'wallet-tx-status pending' },
  held:             { label: 'Ausstehend',              cls: 'wallet-tx-status pending' },
  released:         { label: 'Freigegeben → Lehrer',   cls: 'wallet-tx-status completed' },
  refund_requested: { label: 'Erstattung beantragt',   cls: 'wallet-tx-status pending' },
  refunded:         { label: 'Erstattet → Schüler',    cls: 'wallet-tx-status completed' },
  forfeited:        { label: 'Einbehalten → Lehrer',   cls: 'wallet-tx-status completed' }
};

function _buildEscrowRow(esc) {
  var row = document.createElement('div');
  row.className = 'admin-escrow-row wallet-tx-item';
  row.style.cursor = 'pointer';

  var status    = esc.depositStatus || 'unpaid';
  var statusCfg = _ESCROW_STATUS[status] || { label: status, cls: 'wallet-tx-status' };
  var fmt = function(n) {
    var v = parseFloat(n);
    return (isNaN(v) ? '0,00' : v.toFixed(2).replace('.', ',')) + ' €';
  };
  var fmtDate = function(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch(e) { return iso; }
  };

  var teacherName = ProfileStore.getDisplayName(esc.teacherId) || esc.teacherId || '—';
  var studentName = ProfileStore.getDisplayName(esc.studentId) || esc.studentId || '—';

  /* "New" badge — created within last 24h */
  var isNew = esc.createdAt && (Date.now() - new Date(esc.createdAt).getTime()) < 86400000;
  var newBadge = isNew ? '<span class="badge badge-new" style="background:#f59e0b;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:6px">NEU</span>' : '';

  /* Slot date/time display */
  var slotLabel = esc.slotDate
    ? (esc.slotDate + (esc.slotTime ? ' ' + esc.slotTime : ''))
    : ('Slot: ' + (esc.slotId || '—').slice(0, 12) + '…');

  /* Deposit type label */
  var depositLabel = esc.depositType === 'percent'
    ? esc.depositPercent + '% Deposit'
    : esc.depositType === 'fixed'
    ? 'Fixbetrag Deposit'
    : 'Deposit';

  row.innerHTML =
    '<div class="wallet-tx-icon escrow_hold" aria-hidden="true">⏸</div>' +
    '<div class="wallet-tx-body">' +
      '<div class="wallet-tx-row1">' +
        '<span class="wallet-tx-type">' + _esc(studentName) + ' \u2192 ' + _esc(teacherName) + newBadge + '</span>' +
        '<span class="wallet-tx-amount positive">' + _esc(fmt(esc.depositAmount)) + '</span>' +
      '</div>' +
      '<div class="wallet-tx-row2">' +
        '<span class="wallet-tx-date">' + _esc(slotLabel) + ' &middot; ' + _esc(depositLabel) + '</span>' +
        '<span class="' + statusCfg.cls + '">' + _esc(statusCfg.label) + '</span>' +
      '</div>' +
      '<div class="wallet-tx-desc" style="color:#9ca3af;font-size:11px">Gebucht: ' + fmtDate(esc.createdAt) + '</div>' +
    '</div>';

  /* Click → detail modal */
  row.addEventListener('click', function(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    _showEscrowDetailModal(esc, studentName, teacherName, fmt, fmtDate, depositLabel);
  });

  /* Release button only for 'held' */
  if (status === 'held') {
    var releaseBtn = document.createElement('button');
    releaseBtn.className = 'btn btn-primary btn-sm admin-release-btn';
    releaseBtn.textContent = '▶ Freigeben';
    (function(escrow, btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var result = Modal.show({
          title: 'Zahlung freigeben',
          bodyHTML:
            '<div class="move-dialog">' +
              '<p class="move-dialog-info">Deposit von <strong>' + _esc(studentName) + '</strong>' +
              ' in Höhe von <strong>' + _esc(fmt(escrow.depositAmount)) + '</strong>' +
              ' an <strong>' + _esc(teacherName) + '</strong> freigeben?</p>' +
              '<p class="move-dialog-info">Der Betrag wird sofort dem Lehrer-Wallet gutgeschrieben.</p>' +
            '</div>',
          footerHTML:
            '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>' +
            '<button class="btn btn-primary" id="modal-confirm">Jetzt freigeben</button>'
        });
        document.getElementById('modal-cancel').addEventListener('click', result.close);
        document.getElementById('modal-confirm').addEventListener('click', function() {
          AppService.adminReleaseEscrow(escrow.escrowId, currentUser.uid, function(releaseErr) {
            result.close();
            if (releaseErr) { Toast.error('Fehler: ' + releaseErr.message); return; }
            Toast.success('Zahlung erfolgreich freigegeben.');
            renderEscrows();
            renderStats();
          });
        });
      });
    })(esc, releaseBtn);
    /* Append release button after the status badge in row2 */
    var row2 = row.querySelector('.wallet-tx-row2');
    if (row2) {
      var br = document.createElement('div');
      br.className = 'wallet-tx-release-wrap';
      br.appendChild(releaseBtn);
      row.querySelector('.wallet-tx-body').appendChild(br);
    }
  }

  return row;
}

function _showEscrowDetailModal(esc, studentName, teacherName, fmt, fmtDate, depositLabel) {
  var status    = esc.depositStatus || 'unpaid';
  var statusCfg = _ESCROW_STATUS[status] || { label: status, cls: '' };
  var slotLabel = esc.slotDate
    ? (esc.slotDate + (esc.slotTime ? ' ' + esc.slotTime : ''))
    : (esc.slotId || '—');

  Modal.show({
    title: 'Escrow-Details',
    bodyHTML:
      '<div class="move-dialog" style="font-size:14px;line-height:1.8">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Status</td>' +
              '<td><span class="' + _esc(statusCfg.cls) + '">' + _esc(statusCfg.label) + '</span></td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Schüler</td><td>' + _esc(studentName) + '</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Lehrer</td><td>' + _esc(teacherName) + '</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Stunde</td><td>' + _esc(slotLabel) + '</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Deposit</td><td><strong>' + _esc(fmt(esc.depositAmount)) + '</strong> (' + _esc(depositLabel) + ')</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Gesamtpreis</td><td>' + _esc(fmt(esc.fullAmount)) + '</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Zahlungsmodus</td><td>' + _esc(esc.paymentMode || '—') + '</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Gebucht am</td><td>' + _esc(fmtDate(esc.createdAt)) + '</td></tr>' +
          (esc.depositPaidAt ? '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Bezahlt am</td><td>' + _esc(fmtDate(esc.depositPaidAt)) + '</td></tr>' : '') +
          (esc.releasedAt    ? '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Abgeschlossen am</td><td>' + _esc(fmtDate(esc.releasedAt)) + '</td></tr>' : '') +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Escrow-ID</td><td style="font-size:11px;font-family:monospace">' + _esc(esc.escrowId || '—') + '</td></tr>' +
          '<tr><td style="color:#6b7280;padding:2px 8px 2px 0">Slot-ID</td><td style="font-size:11px;font-family:monospace">' + _esc(esc.slotId || '—') + '</td></tr>' +
        '</table>' +
      '</div>',
    footerHTML: '<button class="btn btn-ghost" id="modal-close-escrow">Schließen</button>'
  });
  var closeBtn = document.getElementById('modal-close-escrow');
  if (closeBtn) closeBtn.addEventListener('click', function() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  });
}

/* ── Discipline label map ────────────────────────────── */
var DISCIPLINE_LABELS = {
  'ski':         'Ski-Instruktor',
  'snowboard':   'Snowboard-Instruktor',
  'paragliding': 'Paragliding-Instruktor',
  'climbing':    'Kletter-Instruktor',
  'diving':      'Tauch-Instruktor',
  'tourguide':   'Reiseführer'
};

function _disciplineLabel(key) {
  return DISCIPLINE_LABELS[key] || key;
}

/* ── Helpers ──────────────────────────────────────────── */
function _showError(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('is-hidden'); }
}

function _clearErrors() {
  var ids = ['e-uid', 'e-name', 'e-role'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) { el.textContent = ''; el.classList.add('is-hidden'); }
  }
}

/* ══════════════════════════════════════════════════════
   AUDIT LOG
   Vollständige Buchungs- und Zahlungshistorie aller User.
   Filterbar nach: Name/UID, Rolle, Typ, Datum, Stundendatum
══════════════════════════════════════════════════════ */

var _auditAllTxs    = [];   /* loaded once, filtered client-side */
var _auditFiltered  = [];   /* currently visible rows */

var _AUDIT_TYPE_LABELS = {
  booking:          'Buchung',
  move:             'Verschiebung',
  cancellation:     'Stornierung',
  teacher_cancel:   'Lehrer-Storno',
  escrow_hold:      'Deposit hinterlegt',
  refund:           'Rückerstattung',
  escrow_release:   'Deposit freigegeben',
  lesson_confirmed: 'Stunde bestätigt',
  deposit:          'Einzahlung',
  withdrawal:       'Auszahlung',
  transfer:         'Transfer'
};

var _AUDIT_TYPE_COLORS = {
  booking:          '#1d4ed8',
  move:             '#7c3aed',
  cancellation:     '#b45309',
  teacher_cancel:   '#dc2626',
  escrow_hold:      '#0369a1',
  refund:           '#059669',
  escrow_release:   '#047857',
  lesson_confirmed: '#15803d',
  deposit:          '#166534',
  withdrawal:       '#9a3412',
  transfer:         '#6b7280'
};

function renderAuditLog() {
  /* Wire up controls once */
  if (!document.getElementById('audit-search')._wired) {
    document.getElementById('audit-search')._wired = true;

    var debounce = null;
    function onFilterChange() {
      clearTimeout(debounce);
      debounce = setTimeout(_auditApplyFilters, 120);
    }

    document.getElementById('audit-search').addEventListener('input', onFilterChange);
    document.getElementById('audit-filter-role').addEventListener('change', onFilterChange);
    document.getElementById('audit-filter-type').addEventListener('change', onFilterChange);
    document.getElementById('audit-date-from').addEventListener('change', onFilterChange);
    document.getElementById('audit-date-to').addEventListener('change', onFilterChange);
    document.getElementById('audit-slot-date').addEventListener('change', onFilterChange);

    document.getElementById('audit-clear-btn').addEventListener('click', function() {
      document.getElementById('audit-search').value       = '';
      document.getElementById('audit-filter-role').value  = 'all';
      document.getElementById('audit-filter-type').value  = 'all';
      document.getElementById('audit-date-from').value    = '';
      document.getElementById('audit-date-to').value      = '';
      document.getElementById('audit-slot-date').value    = '';
      _auditApplyFilters();
    });

    document.getElementById('audit-refresh-btn').addEventListener('click', _auditLoad);

    document.getElementById('audit-export-btn').addEventListener('click', _auditExportCSV);
  }

  _auditLoad();
}

function _auditLoad() {
  var tbody = document.getElementById('audit-tbody');
  tbody.innerHTML = '<tr><td colspan="13" class="table-empty-cell">Lade…</td></tr>';

  AppService.getAllTransactions({}, function(err, txs) {
    if (err) {
      tbody.innerHTML = '<tr><td colspan="13" class="table-empty-cell">Fehler: ' + _esc(err.message) + '</td></tr>';
      return;
    }
    /* Sort newest first */
    txs.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    _auditAllTxs = txs;
    _auditApplyFilters();
  });
}

function _auditApplyFilters() {
  var query     = (document.getElementById('audit-search').value || '').trim().toLowerCase();
  var roleF     = document.getElementById('audit-filter-role').value;
  var typeF     = document.getElementById('audit-filter-type').value;
  var dateFrom  = document.getElementById('audit-date-from').value;
  var dateTo    = document.getElementById('audit-date-to').value;
  var slotDate  = document.getElementById('audit-slot-date').value;

  /* Build uid→role map from current user list for role filter */
  var teachers = AppService.getUsersByRoleSync('teacher');
  var students = AppService.getUsersByRoleSync('student');
  var roleMap  = {};
  teachers.forEach(function(u) { roleMap[u.uid] = 'teacher'; });
  students.forEach(function(u) { roleMap[u.uid] = 'student'; });

  _auditFiltered = _auditAllTxs.filter(function(tx) {
    /* Role filter */
    if (roleF !== 'all' && roleMap[tx.uid] !== roleF) return false;

    /* Type filter */
    if (typeF !== 'all' && tx.type !== typeF) return false;

    /* TX date range */
    if (dateFrom && tx.createdAt && tx.createdAt.slice(0,10) < dateFrom) return false;
    if (dateTo   && tx.createdAt && tx.createdAt.slice(0,10) > dateTo)   return false;

    /* Slot date filter */
    if (slotDate && tx.meta && tx.meta.slotDate && tx.meta.slotDate !== slotDate) return false;
    if (slotDate && (!tx.meta || !tx.meta.slotDate)) return false;

    /* Name / UID search — match against uid, relatedUid, displayNames */
    if (query) {
      var uidMatch      = tx.uid && tx.uid.toLowerCase().indexOf(query) !== -1;
      var relMatch      = tx.relatedUid && tx.relatedUid.toLowerCase().indexOf(query) !== -1;
      var nameMatch     = ProfileStore.getDisplayName(tx.uid).toLowerCase().indexOf(query) !== -1;
      var relNameMatch  = tx.relatedUid && ProfileStore.getDisplayName(tx.relatedUid).toLowerCase().indexOf(query) !== -1;
      var descMatch     = tx.description && tx.description.toLowerCase().indexOf(query) !== -1;
      if (!uidMatch && !relMatch && !nameMatch && !relNameMatch && !descMatch) return false;
    }

    return true;
  });

  _auditRender();
}

function _auditRender() {
  var tbody   = document.getElementById('audit-tbody');
  var summary = document.getElementById('audit-summary');
  var txs     = _auditFiltered;

  /* Summary bar */
  if (txs.length > 0) {
    var totalIn  = 0;
    var totalOut = 0;
    txs.forEach(function(tx) {
      if (tx.amount > 0) totalIn  += tx.amount;
      if (tx.amount < 0) totalOut += tx.amount;
    });
    summary.classList.remove('is-hidden');
    summary.textContent   = txs.length + ' Einträge  ·  ' +
      'Zuflüsse: +' + totalIn.toFixed(2).replace('.', ',') + ' €  ·  ' +
      'Abflüsse: ' + totalOut.toFixed(2).replace('.', ',') + ' €';
  } else {
    summary.classList.add('is-hidden');
  }

  if (!txs.length) {
    tbody.innerHTML = '<tr><td colspan="13" class="table-empty-cell">Keine Einträge für diese Filterauswahl.</td></tr>';
    return;
  }

  var rows = '';
  for (var i = 0; i < txs.length; i++) {
    var tx      = txs[i];
    var meta    = tx.meta || {};
    var typeLabel = _AUDIT_TYPE_LABELS[tx.type] || tx.type;
    var typeColor = _AUDIT_TYPE_COLORS[tx.type] || '#6b7280';
    var typeBadge = '<span style="font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600;background:' + typeColor + '1a;color:' + typeColor + ';border:1px solid ' + typeColor + '33">' + _esc(typeLabel) + '</span>';

    var amt      = typeof tx.amount === 'number' ? tx.amount : 0;
    var amtFmt   = amt === 0 ? '—' : (amt > 0 ? '+' : '') + amt.toFixed(2).replace('.', ',') + ' €';
    var amtColor = amt > 0 ? '#15803d' : amt < 0 ? '#dc2626' : '#6b7280';

    var bal      = typeof tx.balance === 'number' ? tx.balance : null;
    var balFmt   = bal !== null ? bal.toFixed(2).replace('.', ',') + ' €' : '—';

    var slotDt   = '';
    if (meta.slotDate) {
      var sdt  = new Date(meta.slotDate + 'T00:00:00');
      slotDt   = sdt.toLocaleDateString('de-DE', { day:'numeric', month:'short', year:'2-digit' });
      if (meta.slotTime) slotDt += ' ' + meta.slotTime;
    } else if (meta.oldDate) {
      slotDt   = meta.oldDate + ' ' + (meta.oldTime || '') + ' → ' + (meta.newDate || '') + ' ' + (meta.newTime || '');
    }

    var depFmt  = '';
    if (meta.depositAmount > 0) {
      depFmt = meta.depositAmount.toFixed(2).replace('.', ',') + ' €';
      if (meta.depositType === 'percent') depFmt += ' (' + meta.depositPercent + '%)';
      else if (meta.depositType === 'fixed') depFmt += ' (fix)';
    } else {
      depFmt = '—';
    }

    var fullAmtFmt = meta.fullAmount > 0 ? meta.fullAmount.toFixed(2).replace('.', ',') + ' €' : '—';

    var payMode  = meta.paymentMode === 'cash_on_site' ? 'Bar' : meta.paymentMode === 'instant' ? 'Online' : (meta.paymentMode || '—');

    var tier     = meta.cancellationTier ? _esc(meta.cancellationTier) : '—';

    var tsFormatted = tx.createdAt
      ? new Date(tx.createdAt).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
      : '—';

    var userName    = _esc(ProfileStore.getDisplayName(tx.uid));
    var userRole    = { teacher:'Lehrer', student:'Schüler', admin:'Admin' }[AppService.getUserSync(tx.uid) ? AppService.getUserSync(tx.uid).role : ''] || '—';
    var counterpart = tx.relatedUid ? _esc(ProfileStore.getDisplayName(tx.relatedUid)) : '—';

    rows += '<tr style="cursor:pointer" onclick="_auditToggleDetail(this,' + i + ')">' +
      '<td style="font-family:monospace;font-size:11px;color:#6b7280">' + tsFormatted + '</td>' +
      '<td><strong>' + userName + '</strong><br><span style="font-size:10px;color:#9ca3af">' + _esc(tx.uid) + '</span></td>' +
      '<td><span style="font-size:11px;color:#6b7280">' + userRole + '</span></td>' +
      '<td>' + typeBadge + '</td>' +
      '<td style="text-align:right;font-family:monospace;color:' + amtColor + ';font-weight:600">' + amtFmt + '</td>' +
      '<td style="text-align:right;font-family:monospace;font-size:12px;color:#6b7280">' + balFmt + '</td>' +
      '<td style="font-size:12px">' + _esc(slotDt) + '</td>' +
      '<td style="font-size:12px">' + counterpart + '</td>' +
      '<td style="text-align:right;font-family:monospace;font-size:12px">' + fullAmtFmt + '</td>' +
      '<td style="font-size:12px">' + depFmt + '</td>' +
      '<td style="font-size:12px">' + payMode + '</td>' +
      '<td style="font-size:12px">' + tier + '</td>' +
      '<td style="font-size:11px;color:#6b7280;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc(tx.description || '') + '</td>' +
    '</tr>' +
    '<tr class="audit-detail-row" data-audit-idx="' + i + '" style="display:none"><td colspan="13">' +
      _auditDetailHTML(tx) + '</td></tr>';
  }

  tbody.innerHTML = rows;

  /* Wire search to filter table rows by .admin-user-name */
  wireSearchInput('admin-user-search', function(query) {
    var q    = (query || '').trim().toLowerCase();
    var trs  = tbody.querySelectorAll('tr');
    var found = 0;
    for (var ri = 0; ri < trs.length; ri++) {
      var nameEl = trs[ri].querySelector('.admin-user-name');
      var label  = nameEl ? nameEl.textContent.toLowerCase() : '';
      var show   = !q || label.indexOf(q) !== -1;
      trs[ri].classList.toggle('is-hidden', !show);
      if (show) found++;
    }
    var existingEmpty = tbody.querySelector('.admin-search-empty-row');
    if (existingEmpty) existingEmpty.parentNode.removeChild(existingEmpty);
    if (found === 0 && q) {
      var emptyTr = document.createElement('tr');
      emptyTr.className = 'admin-search-empty-row';
      emptyTr.innerHTML = '<td colspan="5" class="table-empty-cell">Kein Benutzer gefunden.</td>';
      tbody.appendChild(emptyTr);
    }
  });
}

function _auditToggleDetail(row, idx) {
  /* Don't toggle if click was on a button inside the row */
  var nextRow = row.nextElementSibling;
  if (!nextRow || !nextRow.classList.contains('audit-detail-row')) return;
  nextRow.classList.toggle('is-hidden');
}

function _auditDetailHTML(tx) {
  var meta = tx.meta || {};
  var rows = '';
  var fields = [
    ['TX-ID',             tx.txId],
    ['Wallet-Inhaber',    tx.uid],
    ['Gegenpartei-UID',   tx.relatedUid || '—'],
    ['Slot-ID',           meta.slotId || '—'],
    ['Escrow-ID',         meta.escrowId || '—'],
    ['Stundendatum',      meta.slotDate || '—'],
    ['Stundenuhrzeit',    meta.slotTime || '—'],
    ['Teacher-UID',       meta.teacherId || '—'],
    ['Schüler-UID',       meta.studentId || '—'],
    ['Gesamtpreis',       meta.fullAmount != null ? meta.fullAmount.toFixed(2).replace('.', ',') + ' €' : '—'],
    ['Deposit-Betrag',    meta.depositAmount != null ? meta.depositAmount.toFixed(2).replace('.', ',') + ' €' : '—'],
    ['Deposit-Typ',       meta.depositType || '—'],
    ['Deposit-Prozent',   meta.depositPercent != null ? meta.depositPercent + '%' : '—'],
    ['Deposit erforderlich', meta.requiresDeposit != null ? (meta.requiresDeposit ? 'Ja' : 'Nein') : '—'],
    ['Zahlungsmodus',     meta.paymentMode || '—'],
    ['Storno-Tier',       meta.cancellationTier || '—'],
    ['Storniert um',      meta.cancelledAt || '—'],
    ['Gebucht um',        meta.bookedAt || '—'],
    ['Verschoben von',    meta.oldDate ? (meta.oldDate + ' ' + (meta.oldTime || '')) : '—'],
    ['Verschoben nach',   meta.newDate ? (meta.newDate + ' ' + (meta.newTime || '')) : '—'],
    ['Initiator-Rolle',   meta.initiatorRole || '—'],
    ['No-Escrow-Grund',   meta.noEscrowReason || '—']
  ];
  fields.forEach(function(f) {
    rows += '<tr><td style="font-size:11px;color:#6b7280;padding:2px 8px;white-space:nowrap">' +
      _esc(f[0]) + '</td><td style="font-size:11px;font-family:monospace;padding:2px 8px">' +
      _esc(String(f[1])) + '</td></tr>';
  });
  return '<div style="background:#f9fafb;padding:8px 16px;border-top:1px solid #e5e7eb">' +
    '<table style="border-collapse:collapse">' + rows + '</table></div>';
}

function _auditExportCSV() {
  var txs = _auditFiltered;
  if (!txs.length) { Toast.info('Keine Daten zum Exportieren.'); return; }

  var header = ['Zeitpunkt','UID','Name','Rolle','Typ','Betrag','Saldo',
    'Stundendatum','Stundenuhrzeit','Gegenpartei-UID','Gegenpartei-Name',
    'Gesamtpreis','Deposit','Deposit-Typ','Deposit-%','Zahlungsmodus',
    'Storno-Tier','Slot-ID','Escrow-ID','Beschreibung'].join(';');

  var lines = [header];
  txs.forEach(function(tx) {
    var meta = tx.meta || {};
    var user = AppService.getUserSync(tx.uid);
    var counterUser = tx.relatedUid ? AppService.getUserSync(tx.relatedUid) : null;
    lines.push([
      tx.createdAt || '',
      tx.uid || '',
      ProfileStore.getDisplayName(tx.uid),
      user ? user.role : '',
      tx.type || '',
      typeof tx.amount === 'number' ? tx.amount.toFixed(2).replace('.', ',') : '',
      typeof tx.balance === 'number' ? tx.balance.toFixed(2).replace('.', ',') : '',
      meta.slotDate || (meta.oldDate || ''),
      meta.slotTime || (meta.oldTime || ''),
      tx.relatedUid || '',
      counterUser ? ProfileStore.getDisplayName(tx.relatedUid) : '',
      meta.fullAmount != null ? meta.fullAmount.toFixed(2).replace('.', ',') : '',
      meta.depositAmount != null ? meta.depositAmount.toFixed(2).replace('.', ',') : '',
      meta.depositType || '',
      meta.depositPercent != null ? meta.depositPercent : '',
      meta.paymentMode || '',
      meta.cancellationTier || '',
      meta.slotId || '',
      meta.escrowId || '',
      (tx.description || '').replace(/;/g, ',')
    ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'));
  });

  var csv  = lines.join('\r\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'audit-log-' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  Toast.success(txs.length + ' Einträge exportiert.');
}
