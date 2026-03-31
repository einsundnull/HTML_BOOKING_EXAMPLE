/* ── wallet.js ───────────────────────────────────────────────────
   Standalone Wallet-Seite (wallet.html).
   Gemeinsame Logik lebt in wallet-core.js (WalletCore).
   Dieser Consumer kümmert sich ausschliesslich um:
     - Auth-Guard + Seiten-Init
     - i18n anwenden (data-i18n Attribute)
     - ID-Mapping für den Standalone-DOM
   Kommuniziert ausschliesslich über AppService.
──────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var _i18n = {};

  /* ── i18n helper ─────────────────────────────────────────── */
  function _t(key, vars) {
    var str = _i18n[key] || key;
    if (vars) { for (var k in vars) { str = str.replace('{' + k + '}', vars[k]); } }
    return str;
  }

  /* ── i18n auf DOM anwenden ───────────────────────────────── */
  function _applyI18n() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      if (_i18n[key]) els[i].textContent = _i18n[key];
    }
    var phEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < phEls.length; j++) {
      var phKey = phEls[j].getAttribute('data-i18n-placeholder');
      if (_i18n[phKey]) phEls[j].setAttribute('placeholder', _i18n[phKey]);
    }
  }

  /* ── Fehler-Handler ──────────────────────────────────────── */
  function _showError(context, err) {
    var msg = (err && err.message) ? err.message : String(err);
    console.error('[Wallet][' + context + ']', err);
    var shown = false;
    if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') {
      try { UI.showToast(context + ': ' + msg, 'error'); shown = true; } catch (e) {}
    }
    if (!shown) {
      var container = document.getElementById('wallet-page') || document.body;
      var existing  = document.getElementById('wallet-inline-error');
      if (existing) existing.remove();
      var div       = document.createElement('div');
      div.id        = 'wallet-inline-error';
      div.className = 'wallet-inline-error';
      div.textContent = context + ': ' + msg;
      container.insertBefore(div, container.firstChild);
      setTimeout(function () { if (div.parentNode) div.remove(); }, 6000);
    }
  }

  /* ── ID-Mapping für den Standalone-DOM ───────────────────── */
  /*
   * wallet.html verwendet diese Element-IDs.
   * WalletCore.createInstance() ruft getId(semanticKey) auf und
   * bekommt die konkrete ID zurück — kein Hardcoding im Core.
   */
  var _ID_MAP = {
    balance:       'wallet-balance-amount',
    txList:        'wallet-tx-list',
    txEmpty:       'wallet-tx-empty',
    depAmt:        'deposit-amount',
    depDesc:       'deposit-desc',
    depBtn:        'btn-deposit',
    depErr:        'deposit-amount-error',
    wdAmt:         'withdraw-amount',
    wdDesc:        'withdraw-desc',
    wdBtn:         'btn-withdraw',
    wdErr:         'withdraw-amount-error',
    confirm:       'wallet-confirm-overlay',
    confirmText:   'wallet-confirm-text',
    confirmOk:     'wallet-confirm-ok',
    confirmCancel: 'wallet-confirm-cancel',
    filterWrap:    'wl-filter-wrap',
    filterType:    'wl-filter-type',
    filterFrom:    'wl-filter-from',
    filterTo:      'wl-filter-to',
    filterAmtMin:  'wl-filter-amt-min',
    filterAmtMax:  'wl-filter-amt-max',
    filterParty:   'wl-filter-party',
    filterSort:    'wl-filter-sort',
    filterReset:   'wl-filter-reset',
    filterCount:   'wl-filter-count'
  };

  function _getId(key) { return _ID_MAP[key] || key; }

  /* ── Init ────────────────────────────────────────────────── */
  /* Use 'load' not 'DOMContentLoaded': defer scripts run after DOMContentLoaded. */
  window.addEventListener('load', function () {
    var user = (typeof Auth !== 'undefined' && typeof Auth.current === 'function') ? Auth.current() : null;
    if (!user) { window.location.href = './index.html'; return; }

    /* _onBalanceUpdate defined here so it closes over user */
    function _onBalanceUpdate(wallet) {
      var badge = document.getElementById('navbar-wallet-amount');
      if (badge && wallet) badge.textContent = (typeof _fmtForUser !== 'undefined')
        ? _fmtForUser(parseFloat(wallet.balance), user.uid)
        : WalletCore.formatAmount(wallet.balance) + ' €';
    }

    function _initWallet() {
    if (typeof Navbar !== 'undefined') Navbar.init('wallet');

    WalletCore.loadI18n(function (i18n) {
      _i18n = i18n;
      _applyI18n();

      var core = WalletCore.createInstance({
        uid:             user.uid,
        i18n:            _i18n,
        getId:           _getId,
        onBalanceUpdate: _onBalanceUpdate,
        onError:         _showError,
        onTxsLoaded:     function(txs) { _buildWalletPartyDropdown(core, user, txs); }
      });

      core.bindEvents();
      core.loadData();
      _bindWalletFilters(core, user);
    });
    } /* end _initWallet */
    if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
      CurrencyService.onReady(_initWallet);
    } else {
      _initWallet();
    }
  });

  /* ── Filter binding for standalone wallet.html ──────── */
  function _bindWalletFilters(core, user) {
    /* Type chips */
    var typeRow = document.getElementById('wl-filter-type');
    if (typeRow) {
      typeRow.addEventListener('click', function(e) {
        var chip = e.target.closest('.wf-chip');
        if (!chip) return;
        typeRow.querySelectorAll('.wf-chip').forEach(function(b) { b.classList.remove('is-active'); });
        chip.classList.add('is-active');
        core.setFilter('type', chip.getAttribute('data-wf-type') || 'all');
        core.refilterAndRender();
      });
    }
    var fromEl = document.getElementById('wl-filter-from');
    if (fromEl) fromEl.addEventListener('change', function() { core.setFilter('dateFrom', fromEl.value || ''); core.refilterAndRender(); });
    var toEl = document.getElementById('wl-filter-to');
    if (toEl) toEl.addEventListener('change', function() { core.setFilter('dateTo', toEl.value || ''); core.refilterAndRender(); });
    var amtMinEl = document.getElementById('wl-filter-amt-min');
    if (amtMinEl) amtMinEl.addEventListener('input', function() { core.setFilter('amtMin', amtMinEl.value); core.refilterAndRender(); });
    var amtMaxEl = document.getElementById('wl-filter-amt-max');
    if (amtMaxEl) amtMaxEl.addEventListener('input', function() { core.setFilter('amtMax', amtMaxEl.value); core.refilterAndRender(); });
    var sortBtn = document.getElementById('wl-filter-sort');
    if (sortBtn) sortBtn.addEventListener('click', function() {
      var asc = !core.getFilters().sortAsc;
      core.setFilter('sortAsc', asc);
      sortBtn.innerHTML = asc
        ? '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 12V2M3 6l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      core.refilterAndRender();
    });
    /* Party dropdown — built via onTxsLoaded after data arrives */
    /* Reset */
    var resetBtn = document.getElementById('wl-filter-reset');
    if (resetBtn) resetBtn.addEventListener('click', function() {
      core.setFilter('type', 'all'); core.setFilter('dateFrom', ''); core.setFilter('dateTo', '');
      core.setFilter('amtMin', ''); core.setFilter('amtMax', ''); core.setFilter('party', 'all');
      if (typeRow) { typeRow.querySelectorAll('.wf-chip').forEach(function(b) { b.classList.remove('is-active'); }); var a = typeRow.querySelector('[data-wf-type="all"]'); if (a) a.classList.add('is-active'); }
      if (fromEl) fromEl.value = ''; if (toEl) toEl.value = '';
      if (amtMinEl) amtMinEl.value = ''; if (amtMaxEl) amtMaxEl.value = '';
      var lbl = document.getElementById('wl-filter-party-lbl'); if (lbl) lbl.textContent = 'Alle';
      var pl = document.getElementById('wl-filter-party-list');
      if (pl) pl.querySelectorAll('.custom-dropdown-item').forEach(function(el) { el.classList.toggle('is-active', el.getAttribute('data-value') === 'all'); });
      core.refilterAndRender();
    });
  }

  function _buildWalletPartyDropdown(core, user, txs) {
    var wrap = document.getElementById('wl-filter-party');
    if (!wrap) return;
    wrap.innerHTML = '';
    var seen = {};
    var options = [{ value: 'all', label: 'Alle' }];
    for (var i = 0; i < (txs || []).length; i++) {
      var uid = txs[i].relatedUid
        || (txs[i].meta && txs[i].meta.teacherId && txs[i].meta.teacherId !== user.uid ? txs[i].meta.teacherId : null)
        || (txs[i].meta && txs[i].meta.studentId && txs[i].meta.studentId !== user.uid ? txs[i].meta.studentId : null);
      if (uid && uid !== user.uid && !seen[uid]) {
        seen[uid] = true;
        options.push({ value: uid, label: ProfileStore.getDisplayName(uid) });
      }
    }
    if (options.length <= 1) return;
    var roleLabel = user.role === 'teacher' ? 'Schüler' : 'Lehrer';
    var ddWrap = document.createElement('div'); ddWrap.className = 'custom-dropdown wf-party-dd';
    var trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'custom-dropdown-trigger';
    var labelSpan = document.createElement('span'); labelSpan.id = 'wl-filter-party-lbl'; labelSpan.className = 'custom-dropdown-label'; labelSpan.textContent = 'Alle';
    trigger.appendChild(labelSpan);
    trigger.insertAdjacentHTML('beforeend', '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    var list = document.createElement('ul'); list.id = 'wl-filter-party-list'; list.className = 'custom-dropdown-list'; list.setAttribute('role', 'listbox');
    function setParty(val, lbl) {
      labelSpan.textContent = lbl;
      list.querySelectorAll('.custom-dropdown-item').forEach(function(el) { el.classList.toggle('is-active', el.getAttribute('data-value') === val); });
      list.classList.remove('is-open'); trigger.classList.remove('is-open');
      core.setFilter('party', val); core.refilterAndRender();
    }
    options.forEach(function(opt) {
      var li = document.createElement('li'); li.className = 'custom-dropdown-item' + (opt.value === 'all' ? ' is-active' : '');
      li.setAttribute('role', 'option'); li.setAttribute('data-value', opt.value); li.textContent = opt.label;
      li.addEventListener('click', function() { setParty(opt.value, opt.label); });
      list.appendChild(li);
    });
    trigger.addEventListener('click', function(e) { e.stopPropagation(); list.classList.toggle('is-open'); trigger.classList.toggle('is-open'); });
    document.addEventListener('click', function() { list.classList.remove('is-open'); trigger.classList.remove('is-open'); });
    ddWrap.appendChild(trigger); ddWrap.appendChild(list);
    var lbl = document.createElement('label'); lbl.className = 'wf-label'; lbl.textContent = roleLabel + ':';
    wrap.appendChild(lbl); wrap.appendChild(ddWrap);
  }

}());
