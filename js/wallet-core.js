/* ── wallet-core.js ───────────────────────────────────────────────
   Gemeinsamer Kern für wallet.js (Standalone-Seite) und
   wallet-panel.js (eingebettetes Panel in teacher/student).

   Stellt bereit:
     WalletCore.createInstance(opts) → Instanz mit allen Shared-Methoden

   Kein direkter DOM-Zugriff hier — alle Element-IDs werden über
   opts.ids(key) vom Aufrufer geliefert (Strategy-Pattern).
   Damit können beide Consumer ihre eigene ID-Namensgebung behalten.

   Architektur-Regel lt. Guideline_Architecture.txt:
   Consumer-Code darf NIEMALS direkt auf Store.* zugreifen.
   Alles läuft über AppService.*(callback).
──────────────────────────────────────────────────────────────── */

var WalletCore = (function () {
  'use strict';

  /* ── Shared TX-Icons ────────────────────────────────────── */
  var TX_ICONS = {
    deposit:          '↑',
    withdrawal:       '↓',
    refund:           '↩',
    cancellation:     '✕',
    escrow_hold:      '⏸',
    escrow_release:   '▶',
    transfer:         '⇄',
    booking:          '✓',
    move:             '↔',
    teacher_cancel:   '✕',
    lesson_confirmed: '★',
    remainder_due:    '⚠'
  };

  /* ── TX-Typ → i18n key ──────────────────────────────────── */
  function _txTypeKey(txType) {
    /* Convert snake_case to CamelCase suffix: teacher_cancel → TeacherCancel */
    var camel = txType.replace(/_([a-z])/g, function(m, c) { return c.toUpperCase(); });
    return 'txType' + camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  /* ── Shared i18n-Loader ─────────────────────────────────── */
  var _sharedI18n       = {};
  var _sharedI18nLoaded = false;
  var _pendingCallbacks = [];

  function loadI18n(callback) {
    if (_sharedI18nLoaded) { callback(_sharedI18n); return; }
    _pendingCallbacks.push(callback);
    if (_pendingCallbacks.length > 1) return; /* bereits lädt */
    var xhr = new XMLHttpRequest();
    xhr.open('GET', './locales/wallet.json');
    xhr.onload = function () {
      try { _sharedI18n = JSON.parse(xhr.responseText); } catch (e) {
        console.error('[WalletCore] wallet.json parse error', e);
      }
      _sharedI18nLoaded = true;
      for (var i = 0; i < _pendingCallbacks.length; i++) {
        _pendingCallbacks[i](_sharedI18n);
      }
      _pendingCallbacks = [];
    };
    xhr.onerror = function () {
      _sharedI18nLoaded = true;
      for (var i = 0; i < _pendingCallbacks.length; i++) {
        _pendingCallbacks[i](_sharedI18n);
      }
      _pendingCallbacks = [];
    };
    xhr.send();
  }

  /* ── Shared Formatierung ────────────────────────────────── */
  function formatAmount(amount, currencyCode) {
    var n = parseFloat(amount);
    if (isNaN(n)) return '0,00';
    /* Use CurrencyService if a currency code is provided and service is available */
    if (currencyCode && typeof CurrencyService !== 'undefined') {
      return CurrencyService.format(n, currencyCode);
    }
    return n.toFixed(2).replace('.', ',');
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
             ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso || ''; }
  }

  /* ── Shared TX-Item-Builder ─────────────────────────────── */
  function buildTxItem(tx, i18n, uid) {
    var li       = document.createElement('li');
    li.className = 'wallet-tx-item';
    if (tx.txId) li.setAttribute('data-txid', tx.txId);

    var txType   = tx.type   || 'deposit';
    var txStatus = tx.status || 'completed';

    var typeLabel   = (i18n[_txTypeKey(txType)] || txType);
    var statusKey   = 'txStatus' + txStatus.charAt(0).toUpperCase() + txStatus.slice(1);
    var statusLabel = (i18n[statusKey] || txStatus);

    var isPositive  = (tx.amount || 0) >= 0;
    /* Resolve display currency from the wallet owner's profile */
    var _txCur = (uid && typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined')
      ? CurrencyService.getUserCurrency(uid) : 'EUR';
    var _txAmt = (uid && typeof CurrencyService !== 'undefined' && _txCur !== 'EUR')
      ? CurrencyService.convertSync(tx.amount || 0, 'EUR', _txCur) : null;
    var _txBal = (uid && typeof CurrencyService !== 'undefined' && _txCur !== 'EUR')
      ? CurrencyService.convertSync(tx.balance || 0, 'EUR', _txCur) : null;
    var amountStr  = (isPositive ? '+' : '') + (_txAmt !== null
      ? CurrencyService.format(_txAmt, _txCur)
      : formatAmount(tx.amount || 0, 'EUR') + ' €');
    var balanceStr = _txBal !== null
      ? CurrencyService.format(_txBal, _txCur)
      : formatAmount(tx.balance || 0, 'EUR') + ' €';
    var icon       = TX_ICONS[txType] || '·';

    /* Truncate description in list view */
    var descFull  = tx.description || '';
    var descShort = descFull.length > 55 ? descFull.slice(0, 53) + '…' : descFull;

    /* Build timestamp display: local time primary, UTC badge if dual-ts available */
    var tsDisplay;
    if (tx.createdAtLocal) {
      var localFmt = (function() {
        try {
          var d = new Date(tx.createdAtLocal);
          return d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }) +
                 ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
        } catch(e) { return tx.createdAtLocal || ''; }
      })();
      var utcFmt = (function() {
        try {
          var d2 = new Date(tx.createdAt);
          return d2.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
        } catch(e) { return ''; }
      })();
      tsDisplay = '<span class="wallet-tx-time-block">' +
        _esc(localFmt) +
        '<span class="tx-utc-badge">UTC ' + _esc(utcFmt) + '</span>' +
      '</span>';
    } else {
      tsDisplay = '<span class="wallet-tx-date">' + formatDate(tx.createdAt) + '</span>';
    }

    li.innerHTML =
      '<div class="wallet-tx-icon ' + txType + '" aria-hidden="true">' + icon + '</div>' +
      '<div class="wallet-tx-body">' +
        '<div class="wallet-tx-row1">' +
          '<span class="wallet-tx-type">' + _esc(typeLabel) + '</span>' +
          '<span class="wallet-tx-amount ' + (isPositive ? 'positive' : 'negative') + '">' + _esc(amountStr) + '</span>' +
        '</div>' +
        '<div class="wallet-tx-row2">' +
          tsDisplay +
          '<span class="wallet-tx-balance">' + _esc(balanceStr) + '</span>' +
        '</div>' +
        (descShort ? '<div class="wallet-tx-desc">' + _esc(descShort) + '</div>' : '') +
        buildTxMetaLine(tx) +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0"><span class="wallet-tx-status ' + txStatus + '">' + _esc(statusLabel) + '</span></div>';

    /* Click → open detail sheet */
    li.style.cursor = 'pointer';
    li.addEventListener('click', function() {
      _showTxDetail(tx, i18n, uid);
    });

    return li;
  }

  /* ── Shared TX-Meta-Zeile ───────────────────────────────── */
  function buildTxMetaLine(tx) {
    if (!tx.meta) return '';
    var m = tx.meta;
    var parts = [];

    if (m.slotDate) {
      var d = new Date(m.slotDate + 'T00:00:00');
      var dateLabel = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      parts.push(dateLabel + (m.slotTime ? ' ' + m.slotTime : ''));
    }

    var counterpartId = (m.teacherId && m.teacherId !== tx.uid) ? m.teacherId
                      : (m.studentId && m.studentId !== tx.uid) ? m.studentId : null;
    if (counterpartId && typeof ProfileStore !== 'undefined') {
      var name = ProfileStore.getDisplayName(counterpartId);
      if (name) parts.push(name);
    }

    if (m.cancellationTier) {
      var tierLabels = {
        full_refund:    'Volle Rückerstattung',
        partial:        'Teilrückerstattung',
        forfeit:        'Kein Deposit zurück',
        teacher_cancel: 'Lehrer storniert'
      };
      parts.push(tierLabels[m.cancellationTier] || m.cancellationTier);
    }

    if (m.cancelledAt) {
      var cd = new Date(m.cancelledAt);
      parts.push('Storniert: ' + cd.toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }));
    }

    if (!parts.length) return '';
    return '<div class="wallet-tx-meta">' + _esc(parts.join(' · ')) + '</div>';
  }

  /* ── Shared Validierung ─────────────────────────────────── */
  function validateAmount(inputEl, errEl, i18n) {
    if (!inputEl || !inputEl.value.trim()) {
      if (errEl) { errEl.textContent = i18n['errorAmountRequired'] || 'Betrag erforderlich'; errEl.classList.add('is-visible'); }
      return false;
    }
    var val = parseFloat(inputEl.value);
    if (isNaN(val) || val < 0.01) {
      if (errEl) { errEl.textContent = i18n['errorAmountInvalid'] || 'Ungültiger Betrag'; errEl.classList.add('is-visible'); }
      return false;
    }
    if (errEl) errEl.classList.remove('is-visible');
    return true;
  }

  function clearError(errEl) {
    if (errEl) errEl.classList.remove('is-visible');
  }

  /* ── createInstance ─────────────────────────────────────── */
  /*
   * Gibt eine Instanz aller Shared-Methoden zurück, die an
   * den spezifischen DOM-Kontext (uid + ID-Auflösung) gebunden sind.
   *
   * opts.uid          — string, User-UID
   * opts.i18n         — Referenz auf das i18n-Objekt des Aufrufers
   * opts.getId(key)   — function: liefert DOM-Element-ID für semantischen Schlüssel
   *                     Schlüssel: 'balance', 'txList', 'txEmpty',
   *                                'depAmt', 'depDesc', 'depBtn', 'depErr',
   *                                'wdAmt',  'wdDesc',  'wdBtn',  'wdErr',
   *                                'confirm', 'confirmText', 'confirmOk', 'confirmCancel'
   * opts.onBalanceUpdate(wallet) — optional hook nach Saldo-Änderung
   * opts.onError(context, err)  — Fehler-Handler des Aufrufers
   */
  function createInstance(opts) {
    var _uid        = opts.uid;
    var _i18n       = opts.i18n;
    var _getId      = opts.getId;
    var _onTxsLoaded = opts.onTxsLoaded || null;

    /* ── Filter state ────────────────────────────────── */
    var _filters = {
      type:    'all',
      dateFrom: '',
      dateTo:   '',
      amtMin:   '',
      amtMax:   '',
      party:    'all',
      sortAsc:  false   /* newest first */
    };
    var _allTxs = [];  /* master copy of all transactions */
    var _onBalance  = opts.onBalanceUpdate || function () {};
    var _onError    = opts.onError || function (ctx, err) { console.error('[WalletCore]', ctx, err); };
    var _onHistoryRendered = opts.onHistoryRendered || function() {};
    var _wallet     = null;
    var _pendingAmt = 0;
    var _pendingDsc = '';

    function _t(key, vars) {
      var str = _i18n[key] || key;
      if (vars) { for (var k in vars) { str = str.replace('{' + k + '}', vars[k]); } }
      return str;
    }

    function _el(key) { return document.getElementById(_getId(key)); }

    /* ── Balance ────────────────────────────────────────── */
    function renderBalance(wallet) {
      _wallet = wallet;
      var el = _el('balance');
      if (el) {
        var _bal = wallet ? wallet.balance : 0;
        var _cur = (typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined')
          ? CurrencyService.getUserCurrency(_uid) : 'EUR';
        var _balConverted = (_cur !== 'EUR' && typeof CurrencyService !== 'undefined')
          ? CurrencyService.convertSync(_bal, 'EUR', _cur) : null;
        el.textContent = _balConverted !== null
          ? CurrencyService.format(_balConverted, _cur)
          : formatAmount(_bal);
      }
      _onBalance(wallet);
    }

    /* ── History ────────────────────────────────────────── */
    /* ── Filter + sort pipeline ─────────────────────────── */
    function _applyWalletFilters(txs) {
      var f = _filters;
      var result = txs.slice();

      /* Type filter */
      if (f.type && f.type !== 'all') {
        if (f.type === 'cancellation') {
          result = result.filter(function(t) {
            return t.type === 'cancellation' || t.type === 'teacher_cancel';
          });
        } else {
          result = result.filter(function(t) { return t.type === f.type; });
        }
      }

      /* Date from */
      if (f.dateFrom) {
        result = result.filter(function(t) {
          return (t.createdAt || '').slice(0, 10) >= f.dateFrom;
        });
      }

      /* Date to */
      if (f.dateTo) {
        result = result.filter(function(t) {
          return (t.createdAt || '').slice(0, 10) <= f.dateTo;
        });
      }

      /* Amount min */
      if (f.amtMin !== '' && !isNaN(parseFloat(f.amtMin))) {
        var min = parseFloat(f.amtMin);
        result = result.filter(function(t) { return Math.abs(t.amount) >= min; });
      }

      /* Amount max */
      if (f.amtMax !== '' && !isNaN(parseFloat(f.amtMax))) {
        var max = parseFloat(f.amtMax);
        result = result.filter(function(t) { return Math.abs(t.amount) <= max; });
      }

      /* Party filter (relatedUid) */
      if (f.party && f.party !== 'all') {
        result = result.filter(function(t) {
          return t.relatedUid === f.party ||
            (t.meta && (t.meta.teacherId === f.party || t.meta.studentId === f.party));
        });
      }

      /* Sort */
      result.sort(function(a, b) {
        var da = a.createdAt || '';
        var db = b.createdAt || '';
        return f.sortAsc ? da.localeCompare(db) : db.localeCompare(da);
      });

      return result;
    }

    function _updateFilterCount(filtered, total) {
      var el = document.getElementById(_getId('filterCount') ||
        ('wp-filter-count-' + (_uid || '')));
      if (!el) return;
      el.textContent = filtered.length < total
        ? filtered.length + ' von ' + total + ' Transaktionen'
        : total + ' Transaktionen';
    }

    function _updateResetBtn() {
      var f = _filters;
      var active = f.type !== 'all' || f.dateFrom || f.dateTo ||
        f.amtMin !== '' || f.amtMax !== '' || f.party !== 'all';
      var btn = document.getElementById(_getId('filterReset') ||
        ('wp-filter-reset-' + (_uid || '')));
      if (btn) btn.classList.toggle('is-hidden', !active);
    }

    function refilterAndRender() {
      var filtered = _applyWalletFilters(_allTxs);
      renderHistory(filtered);
      _updateFilterCount(filtered, _allTxs.length);
      _updateResetBtn();
    }

    function renderHistory(txs) {
      var list  = _el('txList');
      var empty = _el('txEmpty');
      if (!list) return;

      var items = list.querySelectorAll('.wallet-tx-item');
      for (var i = 0; i < items.length; i++) { items[i].remove(); }

      if (!txs || txs.length === 0) {
        if (empty) empty.classList.remove('is-hidden');
        return;
      }
      if (empty) empty.classList.add('is-hidden');
      for (var j = 0; j < txs.length; j++) {
        list.appendChild(buildTxItem(txs[j], _i18n, _uid));
      }
      _onHistoryRendered();
    }

    /* ── Daten laden ────────────────────────────────────── */
    function loadData() {
      AppService.getWallet(_uid, function (err, wallet) {
        if (err) { _onError(_t('errorLoadWallet'), err); return; }
        renderBalance(wallet);
      });
      AppService.getTransactions(_uid, function (err, txs) {
        if (err) { _onError(_t('historyLoadError'), err); return; }
        _allTxs = txs || [];
        if (_onTxsLoaded) _onTxsLoaded(_allTxs);
        refilterAndRender();
      });
    }

    function loadHistory() {
      AppService.getTransactions(_uid, function (err, txs) {
        if (err) { _onError(_t('historyLoadError'), err); return; }
        _allTxs = txs || [];
        if (_onTxsLoaded) _onTxsLoaded(_allTxs);
        refilterAndRender();
      });
    }

    /* ── Einzahlen ──────────────────────────────────────── */
    function doDeposit() {
      var inputEl = _el('depAmt');
      var errEl   = _el('depErr');
      if (!validateAmount(inputEl, errEl, _i18n)) return;

      var amount = parseFloat(inputEl.value);
      var desc   = (_el('depDesc') || {}).value || '';
      var btn    = _el('depBtn');
      if (btn) btn.disabled = true;

      AppService.deposit(_uid, amount, desc.trim(), function (err, result) {
        if (btn) btn.disabled = false;
        if (err) { _onError(_t('errorDeposit'), err); return; }
        renderBalance(result.wallet);
        if (inputEl) inputEl.value = '';
        var descEl = _el('depDesc');
        if (descEl) descEl.value = '';
        loadHistory();
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(_t('successDeposit'), 'success');
      });
    }

    /* ── Auszahlen (2 Schritte) ─────────────────────────── */
    function requestWithdraw() {
      var inputEl = _el('wdAmt');
      var errEl   = _el('wdErr');
      if (!validateAmount(inputEl, errEl, _i18n)) return;

      var amount = parseFloat(inputEl.value);
      if (_wallet && amount > _wallet.balance) {
        if (errEl) { errEl.textContent = _t('errorInsufficientFunds'); errEl.classList.add('is-visible'); }
        return;
      }
      _pendingAmt = amount;
      _pendingDsc = ((_el('wdDesc') || {}).value || '').trim();

      var textEl = _el('confirmText');
      var _wdCur = (typeof CurrencyService !== 'undefined' && typeof ProfileStore !== 'undefined')
      ? CurrencyService.getUserCurrency(_uid) : 'EUR';
    var _wdConverted = (_wdCur !== 'EUR' && typeof CurrencyService !== 'undefined')
      ? CurrencyService.convertSync(amount, 'EUR', _wdCur) : null;
    var _wdFmt = _wdConverted !== null
      ? CurrencyService.format(_wdConverted, _wdCur)
      : formatAmount(amount, 'EUR') + ' €';
    if (textEl) textEl.textContent = _t('confirmWithdraw', { amount: _wdFmt });
      openConfirm();
    }

    function doWithdraw() {
      closeConfirm();
      var btn = _el('wdBtn');
      if (btn) btn.disabled = true;

      AppService.withdraw(_uid, _pendingAmt, _pendingDsc, function (err, result) {
        if (btn) btn.disabled = false;
        if (err) { _onError(_t('errorWithdraw'), err); return; }
        renderBalance(result.wallet);
        var wdAmtEl = _el('wdAmt');
        if (wdAmtEl) wdAmtEl.value = '';
        var wdDescEl = _el('wdDesc');
        if (wdDescEl) wdDescEl.value = '';
        loadHistory();
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(_t('successWithdraw'), 'success');
      });
    }

    /* ── Confirm-Dialog ─────────────────────────────────── */
    function openConfirm() {
      var el = _el('confirm');
      if (!el) return;
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overlay-open');
      var okBtn = _el('confirmOk');
      if (okBtn) okBtn.focus();
    }

    function closeConfirm() {
      var el = _el('confirm');
      if (!el) return;
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('overlay-open');
    }

    /* ── Events binden ──────────────────────────────────── */
    function bindEvents() {
      var depBtn = _el('depBtn');
      if (depBtn) depBtn.addEventListener('click', doDeposit);

      var wdBtn = _el('wdBtn');
      if (wdBtn) wdBtn.addEventListener('click', requestWithdraw);

      var okBtn = _el('confirmOk');
      if (okBtn) okBtn.addEventListener('click', doWithdraw);

      var cancelBtn = _el('confirmCancel');
      if (cancelBtn) cancelBtn.addEventListener('click', closeConfirm);

      var overlay = _el('confirm');
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeConfirm();
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) closeConfirm();
      });

      var depAmtEl = _el('depAmt');
      if (depAmtEl) depAmtEl.addEventListener('input', function () { clearError(_el('depErr')); });

      var wdAmtEl = _el('wdAmt');
      if (wdAmtEl) wdAmtEl.addEventListener('input', function () { clearError(_el('wdErr')); });
    }

    return {
      renderBalance:       renderBalance,
      renderHistory:       renderHistory,
      loadData:            loadData,
      loadHistory:         loadHistory,
      refilterAndRender:   refilterAndRender,
      getFilters:          function() { return _filters; },
      setFilter:           function(key, val) { _filters[key] = val; },
      doDeposit:           doDeposit,
      requestWithdraw:     requestWithdraw,
      doWithdraw:          doWithdraw,
      openConfirm:         openConfirm,
      closeConfirm:   closeConfirm,
      bindEvents:     bindEvents
    };
  }

  /* ── TX Detail Sheet ────────────────────────────────────── */
  function _showTxDetail(tx, i18n, uid) {
    /* Remove any existing sheet */
    var existing = document.getElementById('wallet-tx-detail-sheet');
    if (existing) existing.remove();

    var m         = tx.meta || {};
    var txType    = tx.type || 'deposit';
    var typeLabel = (i18n[_txTypeKey(txType)] || txType);
    var isPos     = (tx.amount || 0) >= 0;
    var icon      = TX_ICONS[txType] || '·';

    /* ── Helper: build a detail row ── */
    function row(label, value, highlight) {
      if (value === null || value === undefined || value === '') return '';
      return '<div class="wtx-detail-row' + (highlight ? ' highlight' : '') + '">' +
        '<span class="wtx-detail-label">' + _esc(label) + '</span>' +
        '<span class="wtx-detail-value">' + value + '</span>' +
        '</div>';
    }
    function fmtDt(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString('de-DE', {
        day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
    }
    function fmtDate2(iso) {
      if (!iso) return '—';
      return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday:'short', day:'numeric', month:'short', year:'numeric'
      });
    }
    function name(uid) {
      if (!uid) return null;
      var n = (typeof ProfileStore !== 'undefined') ? ProfileStore.getDisplayName(uid) : null;
      return n ? _esc(n) + ' <span style="color:#9ca3af;font-size:11px">(' + _esc(uid) + ')</span>' : _esc(uid);
    }
    function money(v) {
      if (v === null || v === undefined) return null;
      if (typeof _fmtForUser !== 'undefined') return _esc(_fmtForUser(parseFloat(v), uid));
      return _esc(parseFloat(v).toFixed(2).replace('.', ',') + ' €');
    }

    /* ── Helper: build a dual-timestamp row (local + UTC + timezone) ── */
    function rowDualTs(label, tx) {
      /* Show local time as primary if available, UTC as sub-row, TZ label as sub-row */
      var localIso  = tx.createdAtLocal;
      var utcIso    = tx.createdAt;
      var tz        = tx.actorTimezone;
      if (!utcIso) return '';
      /* Format local time */
      var localDisplay = localIso
        ? new Date(localIso).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : fmtDt(utcIso);
      /* Format UTC time */
      var utcDisplay = fmtDt(utcIso);
      /* Build offset label from TZ if available */
      var tzLabel = tz && tz !== 'UTC'
        ? _esc(tz) + (typeof TimezoneService !== 'undefined'
            ? ' (' + _esc(TimezoneService.formatOffset(tz, utcIso.slice(0, 10))) + ')'
            : '')
        : 'UTC';

      if (!localIso) {
        /* Legacy TX without dual timestamp — show UTC only */
        return row(label, _esc(utcDisplay));
      }
      return '<div class="wtx-detail-row" style="flex-direction:column;align-items:stretch;padding:0;gap:0;border-bottom:1px solid var(--neutral-100)">' +
        '<div style="display:flex;justify-content:space-between;padding:5px 0">' +
          '<span class="wtx-detail-label">' + _esc(label) + ' (lokal)</span>' +
          '<span class="wtx-detail-value">' + _esc(localDisplay) + '</span>' +
        '</div>' +
        '<div class="wtx-tz-row">' +
          '<span class="wtx-tz-row-label">UTC</span>' +
          '<span class="wtx-tz-row-value">' + _esc(utcDisplay) + '</span>' +
        '</div>' +
        '<div class="wtx-tz-row" style="border-top:none">' +
          '<span class="wtx-tz-row-label">Zeitzone</span>' +
          '<span class="wtx-tz-row-value">' + tzLabel + '</span>' +
        '</div>' +
      '</div>';
    }
    /* Same helper but for meta timestamps (bookedAt, cancelledAt) where local/tz are stored separately */
    function rowMetaTs(label, utcIso, localIso, tz) {
      if (!utcIso) return '';
      var localDisplay = localIso
        ? new Date(localIso).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : fmtDt(utcIso);
      var utcDisplay = fmtDt(utcIso);
      if (!localIso) return row(label, _esc(utcDisplay));
      var tzLabel = tz && tz !== 'UTC'
        ? _esc(tz) + (typeof TimezoneService !== 'undefined'
            ? ' (' + _esc(TimezoneService.formatOffset(tz, utcIso.slice(0, 10))) + ')'
            : '')
        : 'UTC';
      return '<div class="wtx-detail-row" style="flex-direction:column;align-items:stretch;padding:0;gap:0;border-bottom:1px solid var(--neutral-100)">' +
        '<div style="display:flex;justify-content:space-between;padding:5px 0">' +
          '<span class="wtx-detail-label">' + _esc(label) + ' (lokal)</span>' +
          '<span class="wtx-detail-value">' + _esc(localDisplay) + '</span>' +
        '</div>' +
        '<div class="wtx-tz-row">' +
          '<span class="wtx-tz-row-label">UTC</span>' +
          '<span class="wtx-tz-row-value">' + _esc(utcDisplay) + '</span>' +
        '</div>' +
        '<div class="wtx-tz-row" style="border-top:none">' +
          '<span class="wtx-tz-row-label">Zeitzone</span>' +
          '<span class="wtx-tz-row-value">' + tzLabel + '</span>' +
        '</div>' +
      '</div>';
    }

    /* ── Sections ── */
    var secBase = '';
    secBase += row('Typ', _esc(typeLabel));
    secBase += row('Betrag',
      '<strong style="color:' + (isPos ? '#065f46' : '#991b1b') + '">' +
      _esc((isPos ? '+' : '') + (typeof _fmtForUser !== 'undefined' ? _fmtForUser(parseFloat(tx.amount || 0), uid) : parseFloat(tx.amount || 0).toFixed(2).replace('.', ',') + ' €')) +
      '</strong>', true);
    secBase += row('Saldo danach', money(tx.balance));
    secBase += rowDualTs('Zeitpunkt', tx);
    secBase += row('Status', '<span class="wallet-tx-status ' + _esc(tx.status || '') + '">' +
      _esc((i18n['txStatus' + (tx.status || '').charAt(0).toUpperCase() + (tx.status || '').slice(1)] || tx.status || '')) + '</span>');
    secBase += row('Beschreibung', tx.description ? _esc(tx.description) : null);
    secBase += row('Wallet-Inhaber', name(tx.uid));
    secBase += row('Gegenpartei', name(tx.relatedUid));

    var secSlot = '';
    if (m.slotDate) {
      var timeRange = m.slotTimeStart
        ? _esc(m.slotTimeStart + (m.slotTimeEnd ? '–' + m.slotTimeEnd : ''))
        : (m.slotTime ? _esc(m.slotTime) : null);
      secSlot += row('Stundendatum', _esc(fmtDate2(m.slotDate)));
      secSlot += row('Uhrzeit', timeRange);
      if (m.slotCount && m.slotCount > 1) secSlot += row('Anzahl Slots', _esc(String(m.slotCount)));
    }
    if (m.oldDate) {
      secSlot += row('Verschoben von', _esc(fmtDate2(m.oldDate) + (m.oldTime ? ' ' + m.oldTime : '')));
      secSlot += row('Verschoben nach', _esc(fmtDate2(m.newDate) + (m.newTime ? ' ' + m.newTime : '')));
    }
    secSlot += row('Lehrer', name(m.teacherId));
    secSlot += row('Schüler', name(m.studentId));
    if (m.initiatorRole) secSlot += row('Initiiert durch', _esc(m.initiatorRole === 'teacher' ? 'Lehrer' : 'Schüler'));

    var secPayment = '';
    if (m.fullAmount != null && m.fullAmount > 0) secPayment += row('Gesamtpreis', money(m.fullAmount), true);
    if (m.depositAmount != null && m.depositAmount > 0) {
      var depLabel = money(m.depositAmount);
      if (m.depositType === 'percent' && m.depositPercent != null) {
        depLabel += ' <span style="color:#9ca3af;font-size:11px">(' + _esc(String(m.depositPercent)) + '% Deposit)</span>';
      } else if (m.depositType === 'fixed') {
        depLabel += ' <span style="color:#9ca3af;font-size:11px">(Fixbetrag)</span>';
      }
      secPayment += row('Deposit', depLabel);
    }
    if (m.paymentMode) {
      secPayment += row('Zahlungsart', _esc(m.paymentMode === 'cash_on_site' ? 'Bar vor Ort' : 'Online'));
    }
    if (m.bookedAt) secPayment += rowMetaTs('Gebucht am', m.bookedAt, m.bookedAtLocal, tx.actorTimezone);

    var secCancel = '';
    if (m.cancellationTier) {
      var tierMap = { full_refund:'Volle Rückerstattung', partial:'Teilrückerstattung',
        forfeit:'Kein Deposit zurück', teacher_cancel:'Lehrer storniert', no_escrow:'Kein Escrow' };
      secCancel += row('Stornierungsbedingung', _esc(tierMap[m.cancellationTier] || m.cancellationTier), true);
    }
    if (m.cancelledAt) secCancel += rowMetaTs('Storniert am', m.cancelledAt, m.cancelledAtLocal, tx.actorTimezone);
    if (m.noEscrowReason) {
      var noEscMap = { cash_on_site:'Zahlung bar vor Ort', deposit_unpaid:'Deposit nicht bezahlt' };
      secCancel += row('Grund (kein Escrow)', _esc(noEscMap[m.noEscrowReason] || m.noEscrowReason));
    }

    var secIds = '';
    secIds += row('TX-ID', '<span style="font-family:monospace;font-size:11px;color:#9ca3af">' + _esc(tx.txId || '—') + '</span>');
    if (m.escrowId) secIds += row('Escrow-ID', '<span style="font-family:monospace;font-size:11px;color:#9ca3af">' + _esc(m.escrowId) + '</span>');
    if (m.slotId)   secIds += row('Slot-ID',   '<span style="font-family:monospace;font-size:11px;color:#9ca3af">' + _esc(m.slotId) + '</span>');

    function section(title, content) {
      if (!content) return '';
      return '<div class="wtx-detail-section"><div class="wtx-detail-section-title">' +
        _esc(title) + '</div>' + content + '</div>';
    }

    /* Determine the contact recipient (the other party in this TX) */
    var recipientUid = tx.relatedUid || null;
    var m2           = tx.meta || {};
    if (!recipientUid) {
      recipientUid = (m2.teacherId && m2.teacherId !== uid) ? m2.teacherId
                   : (m2.studentId && m2.studentId !== uid) ? m2.studentId : null;
    }
    var canContact = !!(recipientUid && typeof ChatStore !== 'undefined');
    var recipientName = (canContact && typeof ProfileStore !== 'undefined')
      ? ProfileStore.getDisplayName(recipientUid) : '';

    var walletBtnHTML = tx.txId
      ? '<button class="btn btn-ghost wtx-wallet-btn" id="wtx-wallet-btn">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
            '<rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/>' +
            '<path d="M1 7h14M5 1l-2 3M11 1l2 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
            '<circle cx="12" cy="10.5" r="1" fill="currentColor"/>' +
          '</svg>' +
          'In Wallet anzeigen' +
        '</button>'
      : '';

    var footerHTML = (canContact || walletBtnHTML)
      ? '<div class="wtx-detail-footer">' +
          (canContact
            ? '<button class="btn btn-secondary wtx-contact-btn" id="wtx-contact-btn">' +
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
                  '<path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z"' +
                  ' stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
                '</svg>' +
                _esc(recipientName) + ' kontaktieren' +
              '</button>'
            : '') +
          walletBtnHTML +
        '</div>'
      : '';

    var sheet = document.createElement('div');
    sheet.id  = 'wallet-tx-detail-sheet';
    sheet.className = 'wtx-detail-backdrop';
    sheet.innerHTML =
      '<div class="wtx-detail-panel" role="dialog" aria-modal="true">' +
        '<div class="wtx-detail-handle"></div>' +
        '<div class="wtx-detail-header">' +
          '<div class="wallet-tx-icon ' + _esc(txType) + ' wtx-header-icon">' + _esc(icon) + '</div>' +
          '<div>' +
            '<div class="wtx-header-type">' + _esc(typeLabel) + '</div>' +
            '<div class="wtx-header-date">' + _esc(fmtDt(tx.createdAt)) + '</div>' +
          '</div>' +
          '<button class="wtx-detail-close" id="wtx-close-btn" aria-label="Schließen">✕</button>' +
        '</div>' +
        '<div class="wtx-detail-body">' +
          section('Transaktion', secBase) +
          (secSlot    ? section('Stunde', secSlot)       : '') +
          (secPayment ? section('Zahlung', secPayment)   : '') +
          (secCancel  ? section('Stornierung', secCancel): '') +
          section('IDs', secIds) +
          '<div id="wtx-related-section"></div>' +
        '</div>' +
        footerHTML +
      '</div>';

    document.body.appendChild(sheet);

    /* Close handlers */
    function close() {
      sheet.classList.remove('is-open');
      setTimeout(function() { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); }, 300);
    }
    document.getElementById('wtx-close-btn').addEventListener('click', close);
    sheet.addEventListener('click', function(e) { if (e.target === sheet) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    /* Contact button → open TX inquiry compose overlay */
    if (canContact) {
      var contactBtn = document.getElementById('wtx-contact-btn');
      if (contactBtn) {
        contactBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          _showTxInquiryCompose(tx, uid, recipientUid, recipientName, i18n);
        });
      }
    }

    /* "In Wallet anzeigen" button */
    var walletBtn = document.getElementById('wtx-wallet-btn');
    if (walletBtn) {
      walletBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (typeof WalletPanel === 'undefined' || typeof WalletPanel.scrollToTx !== 'function') {
          var nb = document.getElementById('nav-wallet');
          if (nb) nb.click();
          close();
          return;
        }
        var m3     = tx.meta || {};
        var slotId = m3.slotId || (m3.slotIds && m3.slotIds[0]) || null;
        /* Register scroll callback BEFORE closing the sheet */
        WalletPanel.scrollToTx(tx.txId, slotId, uid);
        close();
      });
    }

    /* Animate in */
    requestAnimationFrame(function() { sheet.classList.add('is-open'); });

    /* Load related TXs async and inject into placeholder */
    _loadRelatedTxs(tx, uid, i18n, function(relatedHTML) {
      var relDiv = document.getElementById('wtx-related-section');
      if (relDiv && relatedHTML) {
        relDiv.innerHTML = relatedHTML;
        /* Wire clicks on related items to open their detail sheet */
        var items = relDiv.querySelectorAll('.wtx-related-item');
        for (var ri = 0; ri < items.length; ri++) {
          (function(item) {
            item.addEventListener('click', function() {
              var relTxId = item.getAttribute('data-related-txid');
              if (!relTxId) return;
              AppService.getTransactions(uid, function(err, allTxs) {
                if (err || !allTxs) return;
                for (var k = 0; k < allTxs.length; k++) {
                  if (allTxs[k].txId === relTxId) {
                    close();
                    setTimeout(function(t) { return function() { _showTxDetail(t, i18n, uid); }; }(allTxs[k]), 320);
                    return;
                  }
                }
              });
            });
          })(items[ri]);
        }
      }
    });
  }

  /* ── Related TX Loader ──────────────────────────────────── */
  function _loadRelatedTxs(tx, uid, i18n, callback) {
    if (typeof AppService === 'undefined') { callback(''); return; }

    var m       = tx.meta || {};
    var slotId  = m.slotId  || null;
    var slotIds = m.slotIds || (slotId ? [slotId] : []);

    /* For move TX — use slotIdOld and slotIdNew */
    if (m.slotIdOld) slotIds = [m.slotIdOld, m.slotIdNew].filter(Boolean);

    if (!slotIds.length) { callback(''); return; }

    /* Fetch all TXs for this uid — then find ones sharing a slotId */
    AppService.getTransactions(uid, function(err, txs) {
      if (err || !txs) { callback(''); return; }

      /* Type groups: what to look for based on current TX type */
      var CANCEL_TYPES = ['cancellation', 'refund', 'escrow_release', 'teacher_cancel'];
      var BOOK_TYPES   = ['booking', 'escrow_hold'];

      var isCancelType = CANCEL_TYPES.indexOf(tx.type) !== -1;
      var isBookType   = BOOK_TYPES.indexOf(tx.type) !== -1;
      var lookFor      = isBookType ? CANCEL_TYPES : (isCancelType ? BOOK_TYPES : null);

      if (!lookFor) { callback(''); return; }

      /* Find related TXs: same slotId, different type group, different txId */
      var related = txs.filter(function(t) {
        if (t.txId === tx.txId) return false;
        if (lookFor.indexOf(t.type) === -1) return false;
        var tm = t.meta || {};
        var tSlots = tm.slotIds || (tm.slotId ? [tm.slotId] : []);
        if (tm.slotIdOld) tSlots = [tm.slotIdOld, tm.slotIdNew].filter(Boolean);
        /* Check overlap */
        for (var i = 0; i < slotIds.length; i++) {
          if (tSlots.indexOf(slotIds[i]) !== -1) return true;
        }
        return false;
      });

      if (!related.length) { callback(''); return; }

      /* ── Group by type + slotDate (consecutive = within 30s) ── */
      related.sort(function(a, b) {
        return (a.type || '').localeCompare(b.type || '') ||
               (a.createdAt || '').localeCompare(b.createdAt || '');
      });

      var groups = [];
      related.forEach(function(t) {
        var tm       = t.meta || {};
        var tDate    = tm.slotDate || tm.slotTimeStart || '';
        var tMs      = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        var last     = groups.length ? groups[groups.length - 1] : null;
        var lastMs   = last ? new Date(last.txs[last.txs.length - 1].createdAt || 0).getTime() : 0;
        var sameType = last && last.type === t.type;
        var closeInTime = last && (tMs - lastMs) < 30000; /* 30 second window */

        if (sameType && closeInTime) {
          last.txs.push(t);
          last.totalAmount = Math.round((last.totalAmount + (t.amount || 0)) * 100) / 100;
          if (tDate && last.slotDates.indexOf(tDate) === -1) last.slotDates.push(tDate);
        } else {
          groups.push({
            type:        t.type,
            txs:         [t],
            totalAmount: t.amount || 0,
            createdAt:   t.createdAt,
            slotDates:   tDate ? [tDate] : []
          });
        }
      });

      /* Build HTML — one row per group */
      var label = isBookType
        ? (groups.length === 1 && groups[0].txs.length === 1 ? 'Zugehörige Stornierung' : 'Zugehörige Transaktionen')
        : (groups.length === 1 && groups[0].txs.length === 1 ? 'Ursprüngliche Buchung'  : 'Verknüpfte Transaktionen');

      var rows = groups.map(function(g) {
        var gType      = g.type || '';
        var gTypeLabel = (i18n[_txTypeKey(gType)] || gType);
        var gAmt       = g.totalAmount;
        var gAmtStr    = (gAmt >= 0 ? '+' : '') + (typeof _fmtForUser !== 'undefined' ? _fmtForUser(parseFloat(gAmt), uid) : parseFloat(gAmt).toFixed(2).replace('.', ',') + ' €');
        var gAmtClass  = gAmt >= 0 ? 'positive' : 'negative';
        var gDate      = g.createdAt
          ? new Date(g.createdAt).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
          : '—';
        var gCount     = g.txs.length;
        var gCountStr  = gCount > 1 ? ' (' + gCount + ' Slots)' : '';

        /* Use first TX id for click-through */
        var firstTxId = g.txs[0].txId;

        return '<div class="wtx-related-item" data-related-txid="' + _esc(firstTxId) + '"' +
          ' data-related-txids="' + _esc(g.txs.map(function(t){return t.txId;}).join(',')) + '">' +
          '<div class="wtx-related-icon wallet-tx-icon ' + _esc(gType) + '">' + (TX_ICONS[gType] || '·') + '</div>' +
          '<div class="wtx-related-info">' +
            '<div class="wtx-related-type">' + _esc(gTypeLabel) + _esc(gCountStr) + '</div>' +
            '<div class="wtx-related-date">' + _esc(gDate) + '</div>' +
          '</div>' +
          '<div class="wtx-related-amount wallet-tx-amount ' + gAmtClass + '">' + _esc(gAmtStr) + '</div>' +
        '</div>';
      }).join('');

      var html = '<div class="wtx-detail-section wtx-related-section">' +
        '<div class="wtx-detail-section-title">' + _esc(label) + '</div>' +
        '<div class="wtx-related-list">' + rows + '</div>' +
        '</div>';

      callback(html);
    });
  }

  /* ── TX Inquiry Compose Overlay ─────────────────────────── */
  function _showTxInquiryCompose(tx, senderUid, recipientUid, recipientName, i18n) {
    var existing = document.getElementById('wtx-inquiry-overlay');
    if (existing) existing.remove();

    var m         = tx.meta || {};
    var txType    = tx.type || '';
    var typeLabel = (i18n[_txTypeKey(txType)] || txType);

    /* Build TX summary lines for the message preview */
    var summaryLines = [];
    if (m.slotDate) {
      var slotLabel = m.slotDate + (m.slotTimeStart ? ' ' + m.slotTimeStart : (m.slotTime ? ' ' + m.slotTime : ''));
      if (m.slotTimeEnd) slotLabel += '–' + m.slotTimeEnd;
      summaryLines.push('Stunde: ' + slotLabel);
    }
    if (m.fullAmount > 0)   summaryLines.push('Betrag: €' + parseFloat(m.fullAmount).toFixed(2).replace('.', ','));
    if (m.depositAmount > 0) summaryLines.push('Deposit: €' + parseFloat(m.depositAmount).toFixed(2).replace('.', ','));
    if (m.cancellationTier) {
      var tierMap2 = { full_refund:'Volle Rückerstattung', forfeit:'Kein Deposit zurück',
        teacher_cancel:'Lehrer storniert', partial:'Teilrückerstattung' };
      summaryLines.push('Bedingung: ' + (tierMap2[m.cancellationTier] || m.cancellationTier));
    }
    summaryLines.push('TX-ID: ' + (tx.txId || '').slice(0, 16) + '…');

    var overlay = document.createElement('div');
    overlay.id  = 'wtx-inquiry-overlay';
    overlay.className = 'wtx-inquiry-overlay';
    overlay.innerHTML =
      '<div class="wtx-inquiry-panel">' +
        '<div class="wtx-inquiry-header">' +
          '<button class="wtx-detail-close" id="wtx-inq-close" aria-label="Schließen">✕</button>' +
          '<div class="wtx-inquiry-title">Nachricht an ' + _esc(recipientName) + '</div>' +
        '</div>' +
        '<div class="wtx-inquiry-body">' +
          '<div class="wtx-inquiry-tx-preview">' +
            '<div class="wtx-inquiry-preview-label">Bezieht sich auf</div>' +
            '<div class="wtx-inquiry-preview-type">' + _esc(typeLabel) + '</div>' +
            summaryLines.map(function(l) {
              return '<div class="wtx-inquiry-preview-line">' + _esc(l) + '</div>';
            }).join('') +
          '</div>' +
          '<label class="form-label" for="wtx-inq-msg">Deine Nachricht</label>' +
          '<textarea class="form-input wtx-inquiry-textarea" id="wtx-inq-msg"' +
            ' placeholder="Beschreibe dein Anliegen zu dieser Transaktion…" rows="4"></textarea>' +
          '<span class="form-error-msg is-hidden" id="wtx-inq-err">Bitte eine Nachricht eingeben.</span>' +
        '</div>' +
        '<div class="wtx-inquiry-footer">' +
          '<button class="btn btn-ghost" id="wtx-inq-cancel">Abbrechen</button>' +
          '<button class="btn btn-primary" id="wtx-inq-send">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
              '<path d="M14 2L1 7l5 3 2 5 6-13z" stroke="currentColor" stroke-width="1.5"' +
              ' stroke-linejoin="round" stroke-linecap="round"/>' +
            '</svg>' +
            ' Senden' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function closeInquiry() {
      overlay.classList.remove('is-open');
      setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 250);
    }

    document.getElementById('wtx-inq-close').addEventListener('click', closeInquiry);
    document.getElementById('wtx-inq-cancel').addEventListener('click', closeInquiry);

    document.getElementById('wtx-inq-send').addEventListener('click', function() {
      var textarea = document.getElementById('wtx-inq-msg');
      var errEl    = document.getElementById('wtx-inq-err');
      var msg      = textarea ? textarea.value.trim() : '';
      if (!msg) {
        if (errEl) errEl.classList.remove('is-hidden');
        if (textarea) textarea.focus();
        return;
      }
      if (errEl) errEl.classList.add('is-hidden');

      /* Send via ChatStore.sendTxInquiry */
      if (typeof ChatStore !== 'undefined' && typeof ChatStore.sendTxInquiry === 'function') {
        ChatStore.sendTxInquiry(senderUid, recipientUid, tx, msg);
        if (typeof Toast !== 'undefined') {
          Toast.success('Nachricht an ' + _esc(recipientName) + ' gesendet.');
        }
        closeInquiry();
      } else {
        if (errEl) { errEl.textContent = 'Chat nicht verfügbar.'; errEl.classList.remove('is-hidden'); }
      }
    });

    requestAnimationFrame(function() { overlay.classList.add('is-open'); });
  }

  /* ── Public API ─────────────────────────────────────────── */
  return {
    loadI18n:        loadI18n,
    formatAmount:    formatAmount,
    formatDate:      formatDate,
    buildTxItem:     buildTxItem,
    buildTxMetaLine: buildTxMetaLine,
    validateAmount:  validateAmount,
    clearError:      clearError,
    createInstance:  createInstance,
    TX_ICONS:        TX_ICONS,
    showTxDetail: function(tx, uid) {
      loadI18n(function(i18n) { _showTxDetail(tx, i18n, uid); });
    },
    showTxInquiry: function(tx, senderUid, recipientUid, recipientName) {
      loadI18n(function(i18n) { _showTxInquiryCompose(tx, senderUid, recipientUid, recipientName, i18n); });
    }
  };

}());

window.WalletCore = WalletCore;
