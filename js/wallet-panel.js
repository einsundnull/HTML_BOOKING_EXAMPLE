/* ── wallet-panel.js ─────────────────────────────────────────────
   Wiederverwendbares Wallet-Panel.
   Wird in teacher.html (#teacher-wallet-panel)
   und student.html (#student-wallet-panel) gemountet.

   Gemeinsame Logik lebt in wallet-core.js (WalletCore).
   Dieser Consumer kümmert sich ausschliesslich um:
     - HTML-Struktur des Panels rendern (_buildHTML)
     - ID-Namensgebung (containerId-Präfix)
     - Navbar-Badge synchronisieren
     - Öffentliche API: mount() / refresh()

   API:
     WalletPanel.mount(containerId, uid)
     WalletPanel.refresh(uid)   — Kontostand neu laden
──────────────────────────────────────────────────────────────── */

var WalletPanel = (function () {
  'use strict';

  var _i18n        = {};
  var _uid         = null;
  var _wallet      = null;
  var _containerId = null;
  var _core        = null;

  /* ── i18n helper ─────────────────────────────────────────── */
  function _t(key, vars) {
    var str = _i18n[key] || key;
    if (vars) { for (var k in vars) { str = str.replace('{' + k + '}', vars[k]); } }
    return str;
  }

  /* ── Fehler-Handler ──────────────────────────────────────── */
  function _showError(context, err) {
    var msg = (err && err.message) ? err.message : String(err);
    console.error('[WalletPanel][' + context + ']', err);
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('[WalletPanel] ' + msg, 'error');
    }
  }

  /* ── ID-Mapping mit containerId-Präfix ───────────────────── */
  /*
   * Alle IDs im Panel tragen den Präfix 'wp-<semanticKey>-<containerId>'
   * damit mehrere Panels auf einer Seite koexistieren können.
   */
  function _getId(key) {
    var map = {
      balance:       'wp-balance-'       + _containerId,
      txList:        'wp-tx-list-'       + _containerId,
      txEmpty:       'wp-tx-empty-'      + _containerId,
      depAmt:        'wp-dep-amt-'       + _containerId,
      depDesc:       'wp-dep-desc-'      + _containerId,
      depBtn:        'wp-dep-btn-'       + _containerId,
      depErr:        'wp-dep-err-'       + _containerId,
      wdAmt:         'wp-wd-amt-'        + _containerId,
      wdDesc:        'wp-wd-desc-'       + _containerId,
      wdBtn:         'wp-wd-btn-'        + _containerId,
      wdErr:         'wp-wd-err-'        + _containerId,
      confirm:       'wp-confirm-'       + _containerId,
      confirmText:   'wp-confirm-text-'  + _containerId,
      confirmOk:     'wp-confirm-ok-'    + _containerId,
      confirmCancel: 'wp-confirm-cancel-'+ _containerId,
      filterWrap:    'wp-filter-wrap-'    + _containerId,
      filterType:    'wp-filter-type-'    + _containerId,
      filterFrom:    'wp-filter-from-'    + _containerId,
      filterTo:      'wp-filter-to-'      + _containerId,
      filterAmtMin:  'wp-filter-amt-min-' + _containerId,
      filterAmtMax:  'wp-filter-amt-max-' + _containerId,
      filterParty:   'wp-filter-party-'   + _containerId,
      filterSort:    'wp-filter-sort-'    + _containerId,
      filterReset:   'wp-filter-reset-'   + _containerId
    };
    return map[key] || key;
  }

  /* ── Navbar-Badge synchronisieren ────────────────────────── */
  function _onBalanceUpdate(wallet) {
    _wallet = wallet;
    var badge = document.getElementById('navbar-wallet-amount');
    if (badge && wallet) {
      var _nbCur = (typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined')
        ? CurrencyService.getUserCurrency(_uid) : 'EUR';
      var _nbConv = (_nbCur !== 'EUR' && typeof CurrencyService !== 'undefined')
        ? CurrencyService.convertSync(wallet.balance, 'EUR', _nbCur) : null;
      badge.textContent = _nbConv !== null
        ? CurrencyService.format(_nbConv, _nbCur)
        : WalletCore.formatAmount(wallet.balance) + ' €';
    }
  }

  /* ── HTML-Struktur des Panels ─────────────────────────────── */
  function _buildHTML() {
    var c = _containerId; /* Kurzreferenz für IDs */
    return (
      '<div class="wallet-mockup-notice">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '<span>' + _t('mockupNote') + '</span>' +
      '</div>' +

      '<div class="wallet-balance-card" aria-live="polite">' +
        '<div>' +
          '<div class="wallet-balance-label">' + _t('balance') + '</div>' +
          '<div>' +
            '<span class="wallet-balance-amount" id="wp-balance-' + c + '">—</span>' +
            '<span class="wallet-balance-currency"> ' + _t('currency') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="wallet-balance-icon" aria-hidden="true">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 10h20" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg>' +
        '</div>' +
      '</div>' +

      '<div class="wallet-grid">' +

        '<div class="wallet-action-card">' +
          '<div class="wallet-action-title">' +
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 3v12M4 8l5-5 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            _t('sectionDeposit') +
          '</div>' +
          '<div class="wallet-form-stack">' +
            '<div class="form-group">' +
              '<label class="form-label" for="wp-dep-amt-' + c + '">' + _t('labelAmount') + '</label>' +
              '<div class="wallet-amount-wrap">' +
                '<span class="wallet-amount-prefix" aria-hidden="true">' + ((typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined') ? CurrencyService.getSymbol(CurrencyService.getUserCurrency(_uid)) : '€') + '</span>' +
                '<input class="form-input wallet-amount-input" type="number" id="wp-dep-amt-' + c + '" min="0.01" step="0.01" placeholder="' + _t('placeholderAmount') + '" autocomplete="off" />' +
              '</div>' +
              '<span class="wallet-field-error" id="wp-dep-err-' + c + '" role="alert"></span>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="wp-dep-desc-' + c + '">' + _t('labelDescription') + '</label>' +
              '<input class="form-input" type="text" id="wp-dep-desc-' + c + '" placeholder="' + _t('placeholderDesc') + '" autocomplete="off" />' +
            '</div>' +
            '<button class="btn btn-primary" id="wp-dep-btn-' + c + '" type="button">' +
              '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v12M3 7l5-5 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              _t('btnDeposit') +
            '</button>' +
          '</div>' +
        '</div>' +

        '<div class="wallet-action-card">' +
          '<div class="wallet-action-title">' +
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 3v12M4 10l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            _t('sectionWithdraw') +
          '</div>' +
          '<div class="wallet-form-stack">' +
            '<div class="form-group">' +
              '<label class="form-label" for="wp-wd-amt-' + c + '">' + _t('labelAmount') + '</label>' +
              '<div class="wallet-amount-wrap">' +
                '<span class="wallet-amount-prefix" aria-hidden="true">' + ((typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined') ? CurrencyService.getSymbol(CurrencyService.getUserCurrency(_uid)) : '€') + '</span>' +
                '<input class="form-input wallet-amount-input" type="number" id="wp-wd-amt-' + c + '" min="0.01" step="0.01" placeholder="' + _t('placeholderAmount') + '" autocomplete="off" />' +
              '</div>' +
              '<span class="wallet-field-error" id="wp-wd-err-' + c + '" role="alert"></span>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="wp-wd-desc-' + c + '">' + _t('labelDescription') + '</label>' +
              '<input class="form-input" type="text" id="wp-wd-desc-' + c + '" placeholder="' + _t('placeholderDesc') + '" autocomplete="off" />' +
            '</div>' +
            '<button class="btn btn-secondary" id="wp-wd-btn-' + c + '" type="button">' +
              '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              _t('btnWithdraw') +
            '</button>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="wallet-filter-bar" id="wp-filter-wrap-' + c + '">' +
        '<div class="wallet-filter-type-row" id="wp-filter-type-' + c + '">' +
          '<button class="wf-chip is-active" data-wf-type="all">Alle</button>' +
          '<button class="wf-chip" data-wf-type="deposit">&#8593; Einzahlung</button>' +
          '<button class="wf-chip" data-wf-type="withdrawal">&#8595; Auszahlung</button>' +
          '<button class="wf-chip" data-wf-type="escrow_hold">&#9646; Deposit</button>' +
          '<button class="wf-chip" data-wf-type="refund">&#8617; Refund</button>' +
          '<button class="wf-chip" data-wf-type="booking">&#10003; Buchung</button>' +
          '<button class="wf-chip" data-wf-type="cancellation">&#10005; Storno</button>' +
          '<button class="wf-chip" data-wf-type="lesson_confirmed">&#9733; Best\u00e4tigt</button>' +
          '<button class="wf-chip" data-wf-type="escrow_release">&#9654; Freigabe</button>' +
        '</div>' +
        '<div class="wallet-filter-date-row">' +
          '<label class="wf-label">Von</label>' +
          '<input type="date" class="wf-date" id="wp-filter-from-' + c + '" />' +
          '<label class="wf-label">Bis</label>' +
          '<input type="date" class="wf-date" id="wp-filter-to-' + c + '" />' +
          '<button class="wf-sort-btn" id="wp-filter-sort-' + c + '" title="Sortierung">' +
            '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="wallet-filter-amt-row">' +
          '<label class="wf-label">Betrag</label>' +
          '<span class="wf-prefix">' + ((typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined') ? CurrencyService.getSymbol(CurrencyService.getUserCurrency(_uid)) : '€') + '</span>' +
          '<input type="number" class="wf-amt" id="wp-filter-amt-min-' + c + '" placeholder="Min" min="0" step="0.01" />' +
          '<span class="wf-sep">–</span>' +
          '<span class="wf-prefix">' + ((typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined') ? CurrencyService.getSymbol(CurrencyService.getUserCurrency(_uid)) : '€') + '</span>' +
          '<input type="number" class="wf-amt" id="wp-filter-amt-max-' + c + '" placeholder="Max" min="0" step="0.01" />' +
        '</div>' +
        '<div class="wallet-filter-party-row" id="wp-filter-party-' + c + '"></div>' +
        '<div class="wallet-filter-reset-row">' +
          '<button class="wf-reset-btn is-hidden" id="wp-filter-reset-' + c + '">&#10005; Filter zurücksetzen</button>' +
          '<span class="wf-count" id="wp-filter-count-' + c + '"></span>' +
        '</div>' +
      '</div>' +

      '<div class="wallet-history-card">' +
        '<div class="wallet-history-header">' +
          '<div class="wallet-history-title">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            _t('sectionHistory') +
          '</div>' +
        '</div>' +
        '<ul class="wallet-tx-list" id="wp-tx-list-' + c + '" aria-live="polite">' +
          '<li class="wallet-history-empty is-hidden" id="wp-tx-empty-' + c + '">' + _t('historyEmpty') + '</li>' +
        '</ul>' +
      '</div>' +

      '<div class="wallet-confirm-overlay" id="wp-confirm-' + c + '" role="dialog" aria-modal="true" aria-hidden="true">' +
        '<div class="wallet-confirm-dialog">' +
          '<div class="wallet-confirm-title">' + _t('sectionWithdraw') + '</div>' +
          '<div class="wallet-confirm-text" id="wp-confirm-text-' + c + '"></div>' +
          '<div class="wallet-confirm-actions">' +
            '<button class="btn btn-secondary" id="wp-confirm-cancel-' + c + '" type="button">' + _t('confirmCancelBtn') + '</button>' +
            '<button class="btn btn-primary"   id="wp-confirm-ok-' + c + '"     type="button">' + _t('confirmWithdrawBtn') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── Öffentliche API ─────────────────────────────────────── */

  function mount(containerId, uid) {
    _containerId = containerId;
    _uid         = uid;

    var container = document.getElementById(containerId);
    if (!container) {
      console.error('[WalletPanel] Container nicht gefunden:', containerId);
      return;
    }

    WalletCore.loadI18n(function (i18n) {
      _i18n = i18n;
      container.innerHTML = _buildHTML();

      _isReady = false;
      _core = WalletCore.createInstance({
        uid:               _uid,
        i18n:              _i18n,
        getId:             _getId,
        onBalanceUpdate:   _onBalanceUpdate,
        onError:           _showError,
        onHistoryRendered: _notifyReady,
        onTxsLoaded:       function(txs) { _buildPartyFilter(txs); }
      });

      _core.bindEvents();
      _core.loadData();
      _bindFilterEvents();
    });
  }

  /* ── Filter event binding ────────────────────────────── */
  function _bindFilterEvents() {
    if (!_core) return;
    var c = _containerId;

    /* Type chips */
    var typeRow = document.getElementById('wp-filter-type-' + c);
    if (typeRow) {
      typeRow.addEventListener('click', function(e) {
        var chip = e.target.closest('.wf-chip');
        if (!chip) return;
        typeRow.querySelectorAll('.wf-chip').forEach(function(b) { b.classList.remove('is-active'); });
        chip.classList.add('is-active');
        _core.setFilter('type', chip.getAttribute('data-wf-type') || 'all');
        _core.refilterAndRender();
      });
    }

    /* Date from */
    var fromEl = document.getElementById('wp-filter-from-' + c);
    if (fromEl) fromEl.addEventListener('change', function() {
      _core.setFilter('dateFrom', fromEl.value || '');
      _core.refilterAndRender();
    });

    /* Date to */
    var toEl = document.getElementById('wp-filter-to-' + c);
    if (toEl) toEl.addEventListener('change', function() {
      _core.setFilter('dateTo', toEl.value || '');
      _core.refilterAndRender();
    });

    /* Amount min */
    var amtMinEl = document.getElementById('wp-filter-amt-min-' + c);
    if (amtMinEl) amtMinEl.addEventListener('input', function() {
      _core.setFilter('amtMin', amtMinEl.value);
      _core.refilterAndRender();
    });

    /* Amount max */
    var amtMaxEl = document.getElementById('wp-filter-amt-max-' + c);
    if (amtMaxEl) amtMaxEl.addEventListener('input', function() {
      _core.setFilter('amtMax', amtMaxEl.value);
      _core.refilterAndRender();
    });

    /* Sort button */
    var sortBtn = document.getElementById('wp-filter-sort-' + c);
    if (sortBtn) sortBtn.addEventListener('click', function() {
      var asc = !_core.getFilters().sortAsc;
      _core.setFilter('sortAsc', asc);
      sortBtn.innerHTML = asc
        ? '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 12V2M3 6l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      _core.refilterAndRender();
    });

    /* Party dropdown — built via onTxsLoaded callback after data arrives */

    /* Reset button */
    var resetBtn = document.getElementById('wp-filter-reset-' + c);
    if (resetBtn) resetBtn.addEventListener('click', function() {
      /* Reset all filter state */
      _core.setFilter('type', 'all');
      _core.setFilter('dateFrom', '');
      _core.setFilter('dateTo', '');
      _core.setFilter('amtMin', '');
      _core.setFilter('amtMax', '');
      _core.setFilter('party', 'all');
      /* Reset UI */
      if (typeRow) {
        typeRow.querySelectorAll('.wf-chip').forEach(function(b) { b.classList.remove('is-active'); });
        var allChip = typeRow.querySelector('[data-wf-type="all"]');
        if (allChip) allChip.classList.add('is-active');
      }
      if (fromEl)   fromEl.value   = '';
      if (toEl)     toEl.value     = '';
      if (amtMinEl) amtMinEl.value = '';
      if (amtMaxEl) amtMaxEl.value = '';
      var partyLbl = document.getElementById('wp-filter-party-lbl-' + c);
      if (partyLbl) partyLbl.textContent = 'Alle';
      var partyList = document.getElementById('wp-filter-party-sel-' + c);
      if (partyList) {
        partyList.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
          el.classList.toggle('is-active', el.getAttribute('data-value') === 'all');
        });
      }
      _core.refilterAndRender();
    });
  }

  function _buildPartyFilter(txs) {
    var c   = _containerId;
    var wrap = document.getElementById('wp-filter-party-' + c);
    if (!wrap) return;
    /* Build from unique relatedUids in actual transactions */
    var seen = {};
    var options = [{ value: 'all', label: 'Alle' }];
    for (var i = 0; i < (txs || []).length; i++) {
      var uid = txs[i].relatedUid
        || (txs[i].meta && txs[i].meta.teacherId !== _uid ? txs[i].meta.teacherId : null)
        || (txs[i].meta && txs[i].meta.studentId !== _uid ? txs[i].meta.studentId : null);
      if (uid && uid !== _uid && !seen[uid]) {
        seen[uid] = true;
        options.push({ value: uid,
          label: (typeof ProfileStore !== 'undefined' ? ProfileStore.getDisplayName(uid) : uid) });
      }
    }
    if (options.length <= 1) return; /* no counterparts found */
    wrap.innerHTML = ''; /* clear previous */

    var label = user.role === 'teacher' ? 'Sch\u00fcler' : 'Lehrer';
    /* Custom dropdown — matches app style guide */
    var currentVal = 'all';
    var currentLabel = options[0].label;

    var ddWrap = document.createElement('div');
    ddWrap.className = 'custom-dropdown wf-party-dd';
    ddWrap.id = 'wp-filter-party-dd-' + c;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var labelSpan = document.createElement('span');
    labelSpan.className = 'custom-dropdown-label';
    labelSpan.id = 'wp-filter-party-lbl-' + c;
    labelSpan.textContent = currentLabel;
    trigger.appendChild(labelSpan);
    trigger.insertAdjacentHTML('beforeend',
      '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">'
      + '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>');

    var list = document.createElement('ul');
    list.className = 'custom-dropdown-list';
    list.setAttribute('role', 'listbox');
    list.id = 'wp-filter-party-sel-' + c;

    function setParty(val, lbl) {
      currentVal = val;
      currentLabel = lbl;
      labelSpan.textContent = lbl;
      list.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
        el.classList.toggle('is-active', el.getAttribute('data-value') === val);
      });
      list.classList.remove('is-open');
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      _core.setFilter('party', val);
      _core.refilterAndRender();
    }

    for (var k = 0; k < options.length; k++) {
      (function(opt) {
        var li = document.createElement('li');
        li.className = 'custom-dropdown-item' + (opt.value === 'all' ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.setAttribute('data-value', opt.value);
        li.setAttribute('aria-selected', opt.value === 'all' ? 'true' : 'false');
        li.textContent = opt.label;
        li.addEventListener('click', function() { setParty(opt.value, opt.label); });
        list.appendChild(li);
      })(options[k]);
    }

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = list.classList.contains('is-open');
      list.classList.toggle('is-open', !open);
      trigger.classList.toggle('is-open', !open);
      trigger.setAttribute('aria-expanded', !open ? 'true' : 'false');
    });
    document.addEventListener('click', function() {
      list.classList.remove('is-open');
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    });

    ddWrap.appendChild(trigger);
    ddWrap.appendChild(list);

    var lbl = document.createElement('label');
    lbl.className = 'wf-label';
    lbl.textContent = label + ':';
    wrap.appendChild(lbl);
    wrap.appendChild(ddWrap);
  }

  function refresh(uid) {
    if (uid) _uid = uid;
    /* Always update the navbar badge immediately — even if the wallet panel
       tab was never opened and _core is not yet initialized. */
    if (_uid && typeof AppService !== 'undefined' && AppService.getWallet) {
      AppService.getWallet(_uid, function(err, wallet) {
        if (!err && wallet) _onBalanceUpdate(wallet);
      });
    }
    /* If panel is already mounted and core exists, reload full panel data in-place.
       If not yet mounted (wallet tab not visited), nothing more to update —
       mount() will load fresh data when the tab is opened. */
    if (_core) { _core.loadData(); }
  }

  /* ── onReady queue ───────────────────────────────────────── */
  var _readyCallbacks = [];
  var _isReady        = false;

  function _notifyReady() {
    _isReady = true;
    var cbs = _readyCallbacks.splice(0);
    for (var i = 0; i < cbs.length; i++) { try { cbs[i](); } catch(e) {} }
  }

  function _onReady(cb) {
    if (_isReady) { cb(); } else { _readyCallbacks.push(cb); }
  }

  /**
   * scrollToTx — navigates to wallet view and scrolls to + highlights a TX.
   * @param {string} txId    — primary lookup key
   * @param {string} slotId  — fallback: find own TX sharing this slotId
   * @param {string} uid     — wallet owner uid for fallback lookup
   */
  function scrollToTx(txId, slotId, uid) {
    /* Reset ready state so we wait for the fresh render */
    _isReady = false;

    /* Navigate to wallet view */
    var navBtn = document.getElementById('nav-wallet');
    if (navBtn) navBtn.click();

    function doScroll(id) {
      _onReady(function() {
        var item = document.querySelector('[data-txid="' + id + '"]');
        if (!item) return;
        setTimeout(function() {
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          item.classList.add('wtx-highlight');
          setTimeout(function() { item.classList.remove('wtx-highlight'); }, 2000);
        }, 80);
      });
    }

    /* Try direct txId first — if the item exists after render, use it */
    /* Otherwise fall back to slotId lookup in own wallet */
    if (!slotId || !uid) {
      doScroll(txId);
      return;
    }

    /* After render, check if txId exists; if not, find by slotId */
    _onReady(function() {
      var item = document.querySelector('[data-txid="' + txId + '"]');
      if (item) {
        setTimeout(function() {
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          item.classList.add('wtx-highlight');
          setTimeout(function() { item.classList.remove('wtx-highlight'); }, 2000);
        }, 80);
        return;
      }
      /* Not own TX — find counterpart by slotId */
      if (typeof AppService === 'undefined') return;
      AppService.getTransactions(uid, function(err, txs) {
        if (err || !txs) return;
        for (var j = 0; j < txs.length; j++) {
          var tm = txs[j].meta || {};
          var tSlots = tm.slotIds || (tm.slotId ? [tm.slotId] : []);
          if (tSlots.indexOf(slotId) !== -1) {
            var found = document.querySelector('[data-txid="' + txs[j].txId + '"]');
            if (found) {
              found.scrollIntoView({ behavior: 'smooth', block: 'center' });
              found.classList.add('wtx-highlight');
              setTimeout(function() { found.classList.remove('wtx-highlight'); }, 2000);
            }
            return;
          }
        }
      });
    });
  }

  return {
    mount:       mount,
    refresh:     refresh,
    scrollToTx:  scrollToTx
  };

}());

window.WalletPanel = WalletPanel;
