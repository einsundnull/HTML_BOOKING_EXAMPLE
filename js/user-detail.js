/* ── user-detail.js ──────────────────────────────────────────
   Admin-Detailseite für einen einzelnen User.
   URL: user-detail.html?uid=xxx
   Zeigt: Kontostand, Filter, Chart, Transaktionshistorie, Escrows.
──────────────────────────────────────────────────────────── */

(function() {
  'use strict';

  var _uid      = null;
  var _user     = null;
  var _allTxs   = [];       /* alle TXs, ungefiltert */
  var _parties  = [];       /* [{uid, name}] — verbundene Personen */
  var _selParties = {};     /* { uid: true } — aktive Personen-Auswahl */

  /* ── Filter State ────────────────────────────────────── */
  var _fs = {
    txid:    '',
    type:    'all',
    status:  'all',
    from:    '',
    to:      '',
    amtMin:  '',
    amtMax:  ''
  };

  /* ── Helpers ─────────────────────────────────────────── */
  function _fmt(amount) {
    var n = parseFloat(amount);
    return (isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',')) + ' \u20ac';
  }
  function _fmtDate(iso) {
    if (!iso) return '\u2014';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch(e) { return iso; }
  }
  function _showError(msg) {
    if (typeof Toast !== 'undefined') { Toast.error(msg); return; }
    console.error('[UserDetail]', msg);
  }
  function _getUidParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('uid') || null;
    } catch(e) {
      var m = window.location.search.match(/[?&]uid=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
  }

  /* ── Header ──────────────────────────────────────────── */
  function _renderHeader(user, wallet) {
    var nameEl = document.getElementById('ud-user-name');
    var uidEl  = document.getElementById('ud-user-uid');
    var roleEl = document.getElementById('ud-role-badge');
    if (nameEl) nameEl.textContent = ProfileStore.getDisplayName(user.uid) || user.name || user.uid;
    if (uidEl)  uidEl.textContent  = user.uid;
    if (roleEl) {
      roleEl.textContent = user.role === 'teacher' ? 'Lehrer' : user.role === 'student' ? 'Schüler' : user.role;
      roleEl.className   = 'ud-role-badge ud-role-' + (user.role || 'unknown');
    }
    var bal = document.getElementById('ud-balance');
    if (bal) bal.textContent = wallet ? _fmt(wallet.balance) : '0,00 \u20ac';
  }

  /* ── TX Icons + Labels ───────────────────────────────── */
  var _TX_ICONS = {
    deposit: '\u2191', withdrawal: '\u2193', refund: '\u21a9',
    escrow_hold: '\u23f8', escrow_release: '\u25b6', transfer: '\u21c4',
    booking: '\u2713', cancellation: '\u2715', teacher_cancel: '\u2715',
    move: '\u2192', lesson_confirmed: '\u2605'
  };
  var _TX_LABELS = {
    deposit: 'Einzahlung', withdrawal: 'Auszahlung', refund: 'R\u00fcckerstattung',
    escrow_hold: 'Deposit hinterlegt', escrow_release: 'Zahlung freigegeben',
    transfer: 'Transfer', booking: 'Buchung', cancellation: 'Stornierung',
    teacher_cancel: 'Lehrer-Stornierung', move: 'Verschiebung',
    lesson_confirmed: 'Stunde best\u00e4tigt'
  };
  var _STATUS_LABELS = {
    completed: 'Abgeschlossen', pending: 'Aussstehend', failed: 'Fehlgeschlagen'
  };

  /* ── Filter Logic ────────────────────────────────────── */
  function _applyFilters(txs) {
    var result = txs.slice();
    var f = _fs;

    /* TX-ID search */
    if (f.txid) {
      var q = f.txid.toLowerCase();
      result = result.filter(function(t) {
        return (t.txId || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    /* Type */
    if (f.type && f.type !== 'all') {
      if (f.type === 'cancellation') {
        result = result.filter(function(t) {
          return t.type === 'cancellation' || t.type === 'teacher_cancel';
        });
      } else {
        result = result.filter(function(t) { return t.type === f.type; });
      }
    }

    /* Status */
    if (f.status && f.status !== 'all') {
      result = result.filter(function(t) { return (t.status || 'completed') === f.status; });
    }

    /* Date from */
    if (f.from) {
      result = result.filter(function(t) {
        return (t.createdAt || '').slice(0, 10) >= f.from;
      });
    }

    /* Date to */
    if (f.to) {
      result = result.filter(function(t) {
        return (t.createdAt || '').slice(0, 10) <= f.to;
      });
    }

    /* Amount min */
    if (f.amtMin !== '' && !isNaN(parseFloat(f.amtMin))) {
      var min = parseFloat(f.amtMin);
      result = result.filter(function(t) { return Math.abs(parseFloat(t.amount) || 0) >= min; });
    }

    /* Amount max */
    if (f.amtMax !== '' && !isNaN(parseFloat(f.amtMax))) {
      var max = parseFloat(f.amtMax);
      result = result.filter(function(t) { return Math.abs(parseFloat(t.amount) || 0) <= max; });
    }

    /* Party multi-select */
    var activeParties = Object.keys(_selParties).filter(function(k) { return _selParties[k]; });
    if (activeParties.length > 0) {
      result = result.filter(function(t) {
        var related = t.relatedUid || '';
        var m       = t.meta || {};
        var partyCandidates = [related, m.teacherId, m.studentId];
        for (var i = 0; i < activeParties.length; i++) {
          if (partyCandidates.indexOf(activeParties[i]) !== -1) return true;
        }
        return false;
      });
    }

    return result;
  }

  function _isFiltered() {
    var f = _fs;
    var hasParty = Object.keys(_selParties).some(function(k) { return _selParties[k]; });
    return f.txid || f.type !== 'all' || f.status !== 'all' ||
      f.from || f.to || f.amtMin !== '' || f.amtMax !== '' || hasParty;
  }

  function _refilter() {
    var filtered = _applyFilters(_allTxs);
    _renderTransactions(filtered);
    _renderChart(filtered);
    _updateFilterUI(filtered.length);
  }

  function _updateFilterUI(count) {
    var countEl = document.getElementById('ud-filter-count');
    var resetBtn = document.getElementById('ud-filter-reset');
    var total = _allTxs.length;
    if (countEl) {
      countEl.textContent = _isFiltered()
        ? count + ' von ' + total + ' Transaktionen'
        : total + ' Transaktionen';
    }
    if (resetBtn) resetBtn.classList.toggle('is-hidden', !_isFiltered());

    /* Update party button label */
    var activeCount = Object.keys(_selParties).filter(function(k) { return _selParties[k]; }).length;
    var partyLbl = document.getElementById('ud-party-btn-label');
    if (partyLbl) {
      partyLbl.textContent = activeCount > 0
        ? 'Personen (' + activeCount + ')' : 'Personen';
    }
  }

  /* ── Bind Filter Bar ─────────────────────────────────── */
  function _bindFilterBar() {
    /* TX-ID search */
    var txidEl = document.getElementById('ud-filter-txid');
    if (txidEl) {
      txidEl.addEventListener('input', function() {
        _fs.txid = txidEl.value.trim();
        _refilter();
      });
    }

    /* Date inputs */
    var fromEl = document.getElementById('ud-filter-from');
    var toEl   = document.getElementById('ud-filter-to');
    if (fromEl) fromEl.addEventListener('change', function() { _fs.from = fromEl.value; _refilter(); });
    if (toEl)   toEl.addEventListener('change',   function() { _fs.to   = toEl.value;   _refilter(); });

    /* Amount inputs */
    var amtMin = document.getElementById('ud-filter-amt-min');
    var amtMax = document.getElementById('ud-filter-amt-max');
    if (amtMin) amtMin.addEventListener('input', function() { _fs.amtMin = amtMin.value; _refilter(); });
    if (amtMax) amtMax.addEventListener('input', function() { _fs.amtMax = amtMax.value; _refilter(); });

    /* Custom dropdowns */
    _bindUdDropdown('ud-type',   function(val) { _fs.type   = val; _refilter(); });
    _bindUdDropdown('ud-status', function(val) { _fs.status = val; _refilter(); });

    /* Party button */
    var partyBtn = document.getElementById('ud-party-btn');
    if (partyBtn) partyBtn.addEventListener('click', _openPartyDrawer);

    /* Reset */
    var resetBtn = document.getElementById('ud-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        _fs = { txid: '', type: 'all', status: 'all', from: '', to: '', amtMin: '', amtMax: '' };
        _selParties = {};
        /* Reset UI */
        if (txidEl) txidEl.value = '';
        if (fromEl) fromEl.value = '';
        if (toEl)   toEl.value   = '';
        if (amtMin) amtMin.value = '';
        if (amtMax) amtMax.value = '';
        _resetUdDropdown('ud-type',   'Typ: Alle');
        _resetUdDropdown('ud-status', 'Status: Alle');
        _refilter();
      });
    }
  }

  function _bindUdDropdown(ddId, onChange) {
    var dd      = document.querySelector('[data-dropdown-id="' + ddId + '"]');
    if (!dd) return;
    var trigger = dd.querySelector('.custom-dropdown-trigger');
    var list    = dd.querySelector('.custom-dropdown-list');
    var label   = dd.querySelector('.custom-dropdown-label');
    if (!trigger || !list || !label) return;

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = trigger.classList.contains('is-open');
      _closeAllUdDropdowns();
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
          onChange(val || 'all');
        });
      })(items[i]);
    }
  }

  function _resetUdDropdown(ddId, placeholder) {
    var dd = document.querySelector('[data-dropdown-id="' + ddId + '"]');
    if (!dd) return;
    dd.setAttribute('data-dropdown-value', 'all');
    var label = dd.querySelector('.custom-dropdown-label');
    if (label) label.textContent = placeholder;
    var items = dd.querySelectorAll('.custom-dropdown-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('is-active');
      items[i].setAttribute('aria-selected', 'false');
    }
    var first = dd.querySelector('.custom-dropdown-item');
    if (first) { first.classList.add('is-active'); first.setAttribute('aria-selected', 'true'); }
  }

  function _closeAllUdDropdowns() {
    var triggers = document.querySelectorAll('#ud-filter-bar .custom-dropdown-trigger.is-open');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].classList.remove('is-open');
      triggers[i].setAttribute('aria-expanded', 'false');
      var ddId = triggers[i].getAttribute('data-dropdown-trigger');
      var lst  = document.querySelector('[data-dropdown-list="' + ddId + '"]');
      if (lst) lst.classList.remove('is-open');
    }
  }

  /* ── Party Drawer ────────────────────────────────────── */
  function _openPartyDrawer() {
    var existing = document.getElementById('ud-party-drawer');
    if (existing) existing.remove();

    var isTeacher  = _user && _user.role === 'teacher';
    var drawerTitle = isTeacher ? 'Schüler filtern' : 'Lehrer filtern';

    /* Build checklist HTML */
    var itemsHTML = '';
    if (!_parties.length) {
      itemsHTML = '<p class="ud-party-empty">Keine verbundenen Personen gefunden.</p>';
    } else {
      for (var i = 0; i < _parties.length; i++) {
        var p   = _parties[i];
        var chk = _selParties[p.uid] ? ' checked' : '';
        itemsHTML +=
          '<label class="ud-party-item">' +
            '<input type="checkbox" class="ud-party-chk" value="' + _esc(p.uid) + '"' + chk + ' />' +
            '<span class="ud-party-name">' + _esc(p.name) + '</span>' +
            '<span class="ud-party-uid">' + _esc(p.uid) + '</span>' +
          '</label>';
      }
    }

    var overlay = document.createElement('div');
    overlay.id        = 'ud-party-drawer';
    overlay.className = 'ud-party-overlay';
    overlay.innerHTML =
      '<div class="ud-party-panel">' +
        '<div class="ud-party-header">' +
          '<div class="ud-party-title">' + _esc(drawerTitle) + '</div>' +
          '<button class="ud-party-close" id="ud-party-close" aria-label="Schlie\u00dfen">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="ud-party-list">' + itemsHTML + '</div>' +
        '<div class="ud-party-footer">' +
          '<button class="btn btn-ghost btn-sm" id="ud-party-clear">Alle abwählen</button>' +
          '<button class="btn btn-primary btn-sm" id="ud-party-apply">Anwenden</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('is-open'); });

    function close() {
      overlay.classList.remove('is-open');
      setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 280);
    }

    document.getElementById('ud-party-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });

    document.getElementById('ud-party-clear').addEventListener('click', function() {
      var chks = overlay.querySelectorAll('.ud-party-chk');
      for (var i = 0; i < chks.length; i++) chks[i].checked = false;
    });

    document.getElementById('ud-party-apply').addEventListener('click', function() {
      _selParties = {};
      var chks = overlay.querySelectorAll('.ud-party-chk');
      for (var i = 0; i < chks.length; i++) {
        if (chks[i].checked) _selParties[chks[i].value] = true;
      }
      close();
      _refilter();
    });
  }

  /* ── Load connected parties ──────────────────────────── */
  function _loadParties() {
    if (!_user) return;
    if (_user.role === 'teacher') {
      var sels = AppService.getSelectionsByTeacherSync(_uid);
      _parties = sels.map(function(s) {
        return { uid: s.studentId, name: ProfileStore.getDisplayName(s.studentId) || s.studentId };
      });
    } else {
      var sels2 = AppService.getSelectionsByStudentSync(_uid);
      _parties = sels2.map(function(s) {
        return { uid: s.teacherId, name: ProfileStore.getDisplayName(s.teacherId) || s.teacherId };
      });
    }
  }

  /* ── Balance Chart (SVG) ─────────────────────────────── */
  function _renderChart(txs) {
    var wrap = document.getElementById('ud-chart-wrap');
    var svg  = document.getElementById('ud-chart');
    if (!svg || !wrap) return;

    /* Need at least 2 TXs with balance */
    var pts = txs.filter(function(t) {
      return t.createdAt && typeof t.balance !== 'undefined';
    }).slice().sort(function(a, b) {
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    svg.innerHTML = '';

    if (pts.length < 2) {
      wrap.classList.add('is-hidden');
      return;
    }
    wrap.classList.remove('is-hidden');

    var W = wrap.offsetWidth || 320;
    var H = 120;
    var PAD = { top: 10, right: 12, bottom: 28, left: 48 };
    var cW  = W - PAD.left - PAD.right;
    var cH  = H - PAD.top - PAD.bottom;

    svg.setAttribute('width',   W);
    svg.setAttribute('height',  H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var balances = pts.map(function(t) { return parseFloat(t.balance) || 0; });
    var minB = Math.min.apply(null, balances);
    var maxB = Math.max.apply(null, balances);
    if (minB === maxB) { minB = minB - 1; maxB = maxB + 1; }

    function xPos(i) { return PAD.left + (i / (pts.length - 1)) * cW; }
    function yPos(v) { return PAD.top + (1 - (v - minB) / (maxB - minB)) * cH; }

    /* Grid lines */
    var steps = 4;
    for (var gi = 0; gi <= steps; gi++) {
      var gv   = minB + (gi / steps) * (maxB - minB);
      var gy   = yPos(gv);
      var gLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gLine.setAttribute('x1', PAD.left); gLine.setAttribute('x2', W - PAD.right);
      gLine.setAttribute('y1', gy);       gLine.setAttribute('y2', gy);
      gLine.setAttribute('stroke', '#e2e6eb'); gLine.setAttribute('stroke-width', '1');
      svg.appendChild(gLine);

      var gTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      gTxt.setAttribute('x', PAD.left - 4);
      gTxt.setAttribute('y', gy + 4);
      gTxt.setAttribute('text-anchor', 'end');
      gTxt.setAttribute('font-size', '9');
      gTxt.setAttribute('fill', '#9aa3af');
      gTxt.textContent = Math.round(gv) + '\u20ac';
      svg.appendChild(gTxt);
    }

    /* Area fill */
    var area = 'M ' + xPos(0) + ' ' + (PAD.top + cH);
    for (var ai = 0; ai < pts.length; ai++) {
      area += ' L ' + xPos(ai) + ' ' + yPos(balances[ai]);
    }
    area += ' L ' + xPos(pts.length - 1) + ' ' + (PAD.top + cH) + ' Z';
    var areaEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaEl.setAttribute('d', area);
    areaEl.setAttribute('fill', 'rgba(77,122,160,0.12)');
    svg.appendChild(areaEl);

    /* Line */
    var linePts = pts.map(function(t, i) {
      return xPos(i) + ',' + yPos(parseFloat(t.balance) || 0);
    }).join(' ');
    var polyEl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyEl.setAttribute('points', linePts);
    polyEl.setAttribute('fill', 'none');
    polyEl.setAttribute('stroke', '#4d7aa0');
    polyEl.setAttribute('stroke-width', '2');
    polyEl.setAttribute('stroke-linejoin', 'round');
    polyEl.setAttribute('stroke-linecap', 'round');
    svg.appendChild(polyEl);

    /* Dots + tooltips */
    for (var pi = 0; pi < pts.length; pi++) {
      (function(t, i) {
        var cx = xPos(i);
        var cy = yPos(parseFloat(t.balance) || 0);
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', '3');
        circle.setAttribute('fill', '#4d7aa0'); circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '1.5');

        var tip = (_TX_LABELS[t.type] || t.type || '') + '\n' +
          _fmtDate(t.createdAt) + '\n' +
          'Saldo: ' + _fmt(t.balance);
        var titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleEl.textContent = tip;
        circle.appendChild(titleEl);
        svg.appendChild(circle);
      })(pts[pi], pi);
    }

    /* X-axis date labels — first + last only */
    function fmtShort(iso) {
      try { var d = new Date(iso); return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); }
      catch(e) { return ''; }
    }
    var xLbl0 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLbl0.setAttribute('x', PAD.left); xLbl0.setAttribute('y', H - 6);
    xLbl0.setAttribute('font-size', '9'); xLbl0.setAttribute('fill', '#9aa3af');
    xLbl0.setAttribute('text-anchor', 'middle');
    xLbl0.textContent = fmtShort(pts[0].createdAt);
    svg.appendChild(xLbl0);

    var xLblN = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLblN.setAttribute('x', xPos(pts.length - 1)); xLblN.setAttribute('y', H - 6);
    xLblN.setAttribute('font-size', '9'); xLblN.setAttribute('fill', '#9aa3af');
    xLblN.setAttribute('text-anchor', 'middle');
    xLblN.textContent = fmtShort(pts[pts.length - 1].createdAt);
    svg.appendChild(xLblN);
  }

  /* ── TX List ─────────────────────────────────────────── */
  function _renderTransactions(txs) {
    var list   = document.getElementById('ud-tx-list');
    var empty  = document.getElementById('ud-tx-empty');
    var countEl = document.getElementById('ud-tx-count');
    if (!list) return;

    var items = list.querySelectorAll('.wallet-tx-item');
    for (var i = 0; i < items.length; i++) items[i].remove();

    if (countEl) countEl.textContent = _allTxs.length;

    if (!txs || !txs.length) {
      if (empty) empty.classList.remove('is-hidden');
      return;
    }
    if (empty) empty.classList.add('is-hidden');

    for (var j = 0; j < txs.length; j++) {
      list.appendChild(_buildTxItem(txs[j]));
    }
  }

  function _buildTxItem(tx) {
    var li = document.createElement('li');
    li.className = 'wallet-tx-item';

    var txType    = tx.type || 'deposit';
    var isPos     = (tx.amount || 0) >= 0;
    var icon      = _TX_ICONS[txType]  || '\u00b7';
    var typeLabel = _TX_LABELS[txType] || txType;
    var statLabel = _STATUS_LABELS[tx.status] || (tx.status || 'completed');

    li.innerHTML =
      '<div class="wallet-tx-icon ' + _esc(txType) + '" aria-hidden="true">' + icon + '</div>' +
      '<div class="wallet-tx-body">' +
        '<div class="wallet-tx-row1">' +
          '<span class="wallet-tx-type">' + _esc(typeLabel) + '</span>' +
          '<span class="wallet-tx-amount ' + (isPos ? 'positive' : 'negative') + '">' +
            _esc((isPos ? '+' : '') + _fmt(tx.amount || 0)) +
          '</span>' +
        '</div>' +
        '<div class="wallet-tx-row2">' +
          '<span class="wallet-tx-date">' + _fmtDate(tx.createdAt) + '</span>' +
          '<span class="wallet-tx-status ' + _esc(tx.status || 'completed') + '">' + _esc(statLabel) + '</span>' +
        '</div>' +
        (tx.description ? '<div class="wallet-tx-desc">' + _esc(tx.description) + '</div>' : '') +
      '</div>';

    (function(t) {
      li.addEventListener('click', function() {
        if (typeof WalletCore !== 'undefined' && WalletCore.showTxDetail) {
          WalletCore.showTxDetail(t, _uid);
        }
      });
    })(tx);

    return li;
  }

  /* ── Escrows ─────────────────────────────────────────── */
  var _ESCROW_STATUS_LABELS = {
    unpaid: 'Offen', held: 'Hinterlegt', released: 'Freigegeben',
    refund_requested: 'Erstattung beantragt', refunded: 'Erstattet', forfeited: 'Einbehalten'
  };
  var _ESCROW_STATUS_CLASSES = {
    unpaid: 'escrow-status-open', held: 'escrow-status-held', released: 'escrow-status-released',
    refund_requested: 'escrow-status-refund', refunded: 'escrow-status-refunded',
    forfeited: 'escrow-status-forfeited'
  };

  function _renderEscrows(escrows) {
    var container = document.getElementById('ud-escrow-list');
    var empty     = document.getElementById('ud-escrow-empty');
    var countEl   = document.getElementById('ud-escrow-count');
    if (!container) return;
    var heldCount = escrows ? escrows.filter(function(e) { return e.depositStatus === 'held'; }).length : 0;
    if (countEl) countEl.textContent = heldCount + ' offen';
    if (!escrows || !escrows.length) {
      if (empty) empty.classList.remove('is-hidden');
      return;
    }
    if (empty) empty.classList.add('is-hidden');
    container.innerHTML = '';
    for (var i = 0; i < escrows.length; i++) container.appendChild(_buildEscrowItem(escrows[i]));
  }

  function _buildEscrowItem(esc) {
    var wrapper = document.createElement('div');
    wrapper.className = 'ud-escrow-item';
    var status      = esc.depositStatus || 'unpaid';
    var statusLabel = _ESCROW_STATUS_LABELS[status] || status;
    var statusClass = _ESCROW_STATUS_CLASSES[status] || '';
    var isTeacher   = _user && _user.role === 'teacher';
    var counterpartId = isTeacher ? esc.studentId : esc.teacherId;
    var counterpart   = counterpartId ? (ProfileStore.getDisplayName(counterpartId) || counterpartId) : '\u2014';
    var counterLabel  = isTeacher ? 'Sch\u00fcler' : 'Lehrer';
    wrapper.innerHTML =
      '<div class="ud-escrow-header">' +
        '<div class="ud-escrow-meta">' +
          '<span class="ud-escrow-amount">' + _esc(_fmt(esc.depositAmount || 0)) + '</span>' +
          '<span class="ud-escrow-counterpart">' + _esc(counterLabel) + ': <strong>' + _esc(counterpart) + '</strong></span>' +
          '<span class="ud-escrow-date">' + _fmtDate(esc.createdAt) + '</span>' +
        '</div>' +
        '<span class="ud-escrow-status ' + statusClass + '">' + _esc(statusLabel) + '</span>' +
      '</div>' +
      '<div class="ud-escrow-ids">' +
        '<code class="uid-badge">Slot: ' + _esc(esc.slotId || '\u2014') + '</code>' +
        '<code class="uid-badge">Escrow: ' + _esc(esc.escrowId || '\u2014') + '</code>' +
      '</div>';
    return wrapper;
  }

  /* ── Load ────────────────────────────────────────────── */
  function _load() {
    _uid = _getUidParam();
    if (!_uid) { _showError('Kein User angegeben.'); return; }
    _user = AppService.getUserSync(_uid);
    if (!_user) { _showError('User nicht gefunden: ' + _uid); return; }

    _renderHeader(_user, null);
    _loadParties();
    _bindFilterBar();

    /* Close dropdowns on outside click */
    document.addEventListener('click', function(e) {
      if (!e.target.closest || !e.target.closest('#ud-filter-bar')) {
        _closeAllUdDropdowns();
      }
    });

    AppService.getWallet(_uid, function(err, wallet) {
      if (!err) _renderHeader(_user, wallet);
    });

    AppService.getTransactions(_uid, function(err, txs) {
      if (err) { _showError('Transaktionen: ' + err.message); return; }
      _allTxs = (txs || []).slice().sort(function(a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      _refilter();
    });

    var escrowFn = (_user.role === 'teacher')
      ? AppService.getEscrowsByTeacher
      : AppService.getEscrowsByStudent;
    escrowFn(_uid, function(err, escrows) {
      if (!err) _renderEscrows(escrows);
    });
  }

  /* ── Init ────────────────────────────────────────────── */
  window.addEventListener('load', function() {
    function _initUserDetail() {
      if (typeof Navbar !== 'undefined') Navbar.init('admin');
      _load();
    }
    if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
      CurrencyService.onReady(_initUserDetail);
    } else {
      _initUserDetail();
    }
  });

}());
