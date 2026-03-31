/**
 * financial.js — Teacher Financial Planner
 * v=2
 *
 * Standalone page for teachers: wallet, KPIs, monthly chart,
 * top students, bookings list, transaction history.
 *
 * Regeln: var only, function(){}, no arrow, no template literals, no ?. or ??
 */

(function() {
  'use strict';

  var _uid  = null;
  var _user = null;
  var _today = new Date().toISOString().slice(0, 10);

  /* ── Filter state ──────────────────────────────── */
  var _bkFilter   = 'all';
  var _bkDateFrom = '';   /* 'YYYY-MM-DD' | '' */
  var _bkDateTo   = '';   /* 'YYYY-MM-DD' | '' */
  var _txFilter   = 'all';
  var _txDateFrom = '';   /* 'YYYY-MM-DD' | '' */
  var _txDateTo   = '';   /* 'YYYY-MM-DD' | '' */
  var _activeKpi  = null; /* which KPI card is drilled into */
  var _escrowMap  = {};   /* slotId → escrow, built after data loads */

  /* ── Cached data ───────────────────────────────── */
  var _slots   = [];
  var _escrows = [];
  var _txs     = [];
  var _wallet  = null;

  /* ── Helpers ───────────────────────────────────── */
  function _fmt(n) {
    var amount = parseFloat(n || 0);
    if (typeof _fmtForUser !== 'undefined' && typeof currentUser !== 'undefined' && currentUser) {
      return _fmtForUser(amount, currentUser.uid);
    }
    return amount.toFixed(2).replace('.', ',') + ' \u20ac';
  }
  function _set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _fmtDate(d) {
    if (!d) return '\u2014';
    var obj = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
    return obj.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  }
  function _fmtDt(iso) {
    if (!iso) return '\u2014';
    var d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
      + ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
  }

  /* ── Init ──────────────────────────────────────── */
  window.addEventListener('load', function() {
    _user = Auth.require('teacher');
    if (!_user) {
      document.getElementById('fin-error').classList.remove('is-hidden');
      return;
    }
    _uid = _user.uid;

    function _initFinancial() {
      Navbar.init('financial');

      document.getElementById('fin-content').classList.remove('is-hidden');
      document.getElementById('fin-subtitle').textContent =
        'Finanzübersicht für ' + (ProfileStore.getDisplayName(_uid) || _uid);

      _bindFilters();
      _bindKpiCards();
      _bindRefresh();
      loadAll();
    }

    if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
      CurrencyService.onReady(_initFinancial);
    } else {
      _initFinancial();
    }
  });

  function _bindRefresh() {
    var btn = document.getElementById('fin-refresh-btn');
    if (btn) btn.addEventListener('click', loadAll);
  }

  /* ── KPI Card drill-down ──────────────────────── */
  function _bindKpiCards() {
    var cards = document.querySelectorAll('.fin-kpi-card[data-kpi]');
    for (var ci = 0; ci < cards.length; ci++) {
      (function(card) {
        card.addEventListener('click', function() {
          var kpi = card.getAttribute('data-kpi');
          /* Toggle — click same card again to reset */
          if (_activeKpi === kpi) {
            _activeKpi = null;
            card.classList.remove('is-active');
            _setKpiChip('all');
          } else {
            _activeKpi = kpi;
            /* Clear all active states */
            for (var i = 0; i < cards.length; i++) cards[i].classList.remove('is-active');
            card.classList.add('is-active');
            _setKpiChip(_kpiToFilter(kpi));
          }
          renderBookings();
          /* Smooth scroll to bookings section */
          var bkSection = document.getElementById('fin-bk-section');
          if (bkSection) bkSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      })(cards[ci]);
    }
  }

  function _kpiToFilter(kpi) {
    if (kpi === 'confirmed') return 'confirmed';
    if (kpi === 'held')      return 'held';
    if (kpi === 'pending')   return 'pending';
    if (kpi === 'future')    return 'future';
    if (kpi === 'refund')    return 'refund';
    return 'all';
  }

  function _setKpiChip(filterVal) {
    _bkFilter = filterVal;
    var bkChips = document.querySelectorAll('[data-fin-bk]');
    for (var i = 0; i < bkChips.length; i++) {
      bkChips[i].classList.toggle('active',
        bkChips[i].getAttribute('data-fin-bk') === filterVal);
    }
  }

  function _bindFilters() {
    /* Booking filter chips */
    var bkChips = document.querySelectorAll('[data-fin-bk]');
    for (var i = 0; i < bkChips.length; i++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          _bkFilter = chip.getAttribute('data-fin-bk');
          for (var j = 0; j < bkChips.length; j++) bkChips[j].classList.remove('active');
          chip.classList.add('active');
          /* Reset KPI active state when manual chip used */
          _activeKpi = null;
          var kpiCards = document.querySelectorAll('.fin-kpi-card');
          for (var kc = 0; kc < kpiCards.length; kc++) kpiCards[kc].classList.remove('is-active');
          renderBookings();
        });
      })(bkChips[i]);
    }

    /* Booking date range — Von / Bis */
    var bkFromEl = document.getElementById('fin-bk-date-from');
    var bkToEl   = document.getElementById('fin-bk-date-to');
    var bkRstEl  = document.getElementById('fin-bk-date-reset');
    function _updateBkDateReset() {
      if (bkRstEl) bkRstEl.classList.toggle('is-hidden', !_bkDateFrom && !_bkDateTo);
    }
    if (bkFromEl) {
      bkFromEl.addEventListener('change', function() {
        _bkDateFrom = bkFromEl.value || '';
        _updateBkDateReset();
        renderBookings();
      });
    }
    if (bkToEl) {
      bkToEl.addEventListener('change', function() {
        _bkDateTo = bkToEl.value || '';
        _updateBkDateReset();
        renderBookings();
      });
    }
    if (bkRstEl) {
      bkRstEl.addEventListener('click', function() {
        _bkDateFrom = ''; _bkDateTo = '';
        if (bkFromEl) bkFromEl.value = '';
        if (bkToEl)   bkToEl.value   = '';
        _updateBkDateReset();
        renderBookings();
      });
    }

    /* TX filter chips */
    var txChips = document.querySelectorAll('[data-fin-tx]');
    for (var k = 0; k < txChips.length; k++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          _txFilter = chip.getAttribute('data-fin-tx');
          for (var l = 0; l < txChips.length; l++) txChips[l].classList.remove('active');
          chip.classList.add('active');
          renderTxHistory();
        });
      })(txChips[k]);
    }

    /* TX date range — Von / Bis */
    var txFromEl = document.getElementById('fin-tx-date-from');
    var txToEl   = document.getElementById('fin-tx-date-to');
    var txRstEl  = document.getElementById('fin-tx-date-reset');
    function _updateTxDateReset() {
      if (txRstEl) txRstEl.classList.toggle('is-hidden', !_txDateFrom && !_txDateTo);
    }
    if (txFromEl) {
      txFromEl.addEventListener('change', function() {
        _txDateFrom = txFromEl.value || '';
        _updateTxDateReset();
        renderTxHistory();
      });
    }
    if (txToEl) {
      txToEl.addEventListener('change', function() {
        _txDateTo = txToEl.value || '';
        _updateTxDateReset();
        renderTxHistory();
      });
    }
    if (txRstEl) {
      txRstEl.addEventListener('click', function() {
        _txDateFrom = ''; _txDateTo = '';
        if (txFromEl) txFromEl.value = '';
        if (txToEl)   txToEl.value   = '';
        _updateTxDateReset();
        renderTxHistory();
      });
    }
  }

  /* ── Load all data ─────────────────────────────── */
  function loadAll() {
    var pending = 4;
    function check() { if (--pending === 0) renderAll(); }

    AppService.getSlotsByTeacher(_uid, function(err, data) {
      _slots = (data || []).filter(function(s) {
        return s.status === 'booked' || s.status === 'confirmed';
      });
      check();
    });
    AppService.getEscrowsByTeacher(_uid, function(err, data) {
      _escrows = data || [];
      check();
    });
    AppService.getTransactions(_uid, function(err, data) {
      _txs = data || [];
      check();
    });
    AppService.getWallet(_uid, function(err, data) {
      _wallet = data || null;
      check();
    });
  }

  function renderAll() {
    /* Build escrow lookup map */
    _escrowMap = {};
    _escrows.forEach(function(e) { _escrowMap[e.slotId] = e; });
    renderWallet();
    renderKPIs();
    renderMonthChart();
    renderTopStudents();
    renderBookings();
    renderTxHistory();
  }

  /* ── Wallet hero ───────────────────────────────── */
  function renderWallet() {
    var balance = _wallet ? parseFloat(_wallet.balance || 0) : 0;
    var _finWalFmt = (typeof _fmtForUser !== 'undefined' && typeof currentUser !== 'undefined' && currentUser)
      ? _fmtForUser(balance, currentUser.uid)
      : balance.toFixed(2).replace('.', ',') + ' €';
    _set('fin-wallet-amount', _finWalFmt);
  }

  /* ── KPI cards ─────────────────────────────────── */
  function renderKPIs() {
    /* 1 — Verdient & ausgezahlt */
    var confirmed = _slots.filter(function(s) { return s.status === 'confirmed'; });
    var confirmedRev = confirmed.reduce(function(sum, s) { return sum + (parseFloat(s.price) || 0); }, 0);
    _set('fin-confirmed-val', _fmt(confirmedRev));
    _set('fin-confirmed-sub', confirmed.length + ' Stunden');

    /* 2 — Deposit gehalten */
    var held = _escrows.filter(function(e) { return e.depositStatus === 'held'; });
    var heldTotal = held.reduce(function(sum, e) { return sum + (parseFloat(e.depositAmount) || 0); }, 0);
    _set('fin-held-val', _fmt(heldTotal));
    _set('fin-held-sub', held.length + ' Slots');

    /* 3 — Fällig bei Bestätigung */
    var escrowMap = {};
    _escrows.forEach(function(e) { escrowMap[e.slotId] = e; });
    var pendingAmt = 0;
    var pendingCount = 0;
    _slots.forEach(function(s) {
      if (s.status !== 'booked') return;
      var e = escrowMap[s.slotId];
      if (!e || e.depositStatus !== 'held') return;
      var rest = (parseFloat(e.fullAmount) || 0) - (parseFloat(e.depositAmount) || 0);
      if (rest > 0) { pendingAmt += rest; pendingCount++; }
    });
    _set('fin-pending-val', _fmt(pendingAmt));
    _set('fin-pending-sub', pendingCount + ' Slots');

    /* 4 — Geplanter Umsatz */
    var future = _slots.filter(function(s) { return s.date >= _today; });
    var futureRev = future.reduce(function(sum, s) { return sum + (parseFloat(s.price) || 0); }, 0);
    _set('fin-future-val', _fmt(futureRev));
    _set('fin-future-sub', future.length + ' Slots');

    /* 5 — Ausstehende Refunds */
    var refunds = _escrows.filter(function(e) { return e.depositStatus === 'refund_requested'; });
    var refundTotal = refunds.reduce(function(sum, e) { return sum + (parseFloat(e.depositAmount) || 0); }, 0);
    _set('fin-refund-val', _fmt(refundTotal));
    _set('fin-refund-sub', refunds.length + ' offen');
  }

  /* ── Monthly bar chart ─────────────────────────── */
  function renderMonthChart() {
    var grid = document.getElementById('fin-months-grid');
    if (!grid) return;

    /* Build last 6 months */
    var months = [];
    var now = new Date();
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      var label = d.toLocaleDateString('de-DE', { month: 'short' });
      months.push({ key: key, label: label, confirmed: 0, booked: 0 });
    }

    /* Aggregate slot prices per month */
    _slots.forEach(function(s) {
      if (!s.date) return;
      var mk = s.date.slice(0, 7);
      for (var mi = 0; mi < months.length; mi++) {
        if (months[mi].key === mk) {
          var price = parseFloat(s.price) || 0;
          if (s.status === 'confirmed') months[mi].confirmed += price;
          else                          months[mi].booked    += price;
          break;
        }
      }
    });

    /* Find max for scaling */
    var maxVal = 1;
    months.forEach(function(m) { var t = m.confirmed + m.booked; if (t > maxVal) maxVal = t; });

    /* Render */
    var totalConfirmed = months.reduce(function(s, m) { return s + m.confirmed; }, 0);
    _set('fin-chart-total', 'Gesamt: ' + _fmt(totalConfirmed));

    grid.innerHTML = '';
    months.forEach(function(m) {
      var total = m.confirmed + m.booked;
      var confirmedPct = Math.round((m.confirmed / maxVal) * 100);
      var bookedPct    = Math.round((m.booked    / maxVal) * 100);

      var col = document.createElement('div');
      col.className = 'fin-month-col';

      var barWrap = document.createElement('div');
      barWrap.className = 'fin-month-bar-wrap';

      var b1 = document.createElement('div');
      b1.className = 'fin-month-bar fin-month-bar--confirmed';
      b1.style.height = confirmedPct + '%';
      b1.title = 'Bestätigt: ' + _fmt(m.confirmed);

      var b2 = document.createElement('div');
      b2.className = 'fin-month-bar fin-month-bar--booked';
      b2.style.height = bookedPct + '%';
      b2.title = 'Gebucht: ' + _fmt(m.booked);

      barWrap.appendChild(b1);
      barWrap.appendChild(b2);

      var lbl = document.createElement('div');
      lbl.className = 'fin-month-label';
      lbl.textContent = m.label;

      var amt = document.createElement('div');
      amt.className = 'fin-month-amt';
      amt.textContent = total > 0 ? _fmt(total) : '';

      col.appendChild(barWrap);
      col.appendChild(lbl);
      col.appendChild(amt);
      grid.appendChild(col);
    });
  }

  /* ── Top students ──────────────────────────────── */
  function renderTopStudents() {
    var list = document.getElementById('fin-top-students');
    if (!list) return;

    /* Aggregate per student */
    var byStudent = {};
    _slots.forEach(function(s) {
      if (!s.studentId) return;
      if (!byStudent[s.studentId]) byStudent[s.studentId] = { slots: 0, revenue: 0 };
      byStudent[s.studentId].slots++;
      byStudent[s.studentId].revenue += parseFloat(s.price) || 0;
    });

    var sorted = Object.keys(byStudent).map(function(uid) {
      return { uid: uid, slots: byStudent[uid].slots, revenue: byStudent[uid].revenue };
    }).sort(function(a, b) { return b.revenue - a.revenue; }).slice(0, 5);

    if (!sorted.length) {
      list.innerHTML = '<li class="fin-empty">Keine Buchungen vorhanden.</li>';
      return;
    }

    list.innerHTML = '';
    sorted.forEach(function(s, idx) {
      var rank = idx + 1;
      var name = ProfileStore.getDisplayName(s.uid) || s.uid;
      var li = document.createElement('li');
      li.className = 'fin-top-item';
      li.innerHTML =
        '<div class="fin-top-rank fin-top-rank--' + rank + '">' + rank + '</div>' +
        '<div class="fin-top-name">' + _esc(name) + '</div>' +
        '<div class="fin-top-slots">' + s.slots + ' Slot' + (s.slots !== 1 ? 's' : '') + '</div>' +
        '<div class="fin-top-amount">' + _esc(_fmt(s.revenue)) + '</div>';
      list.appendChild(li);
    });
  }

  /* ── Bookings list ─────────────────────────────── */
  function renderBookings() {
    var list  = document.getElementById('fin-bk-list');
    var empty = document.getElementById('fin-bk-empty');
    if (!list) return;

    /* 1 — Chip + KPI filter */
    var filtered = _slots.filter(function(s) {
      if (_bkFilter === 'booked')     return s.status === 'booked';
      if (_bkFilter === 'confirmed')  return s.status === 'confirmed';
      if (_bkFilter === 'future')     return s.date >= _today;
      if (_bkFilter === 'past')       return s.date < _today;
      if (_bkFilter === 'held') {
        var e = _escrowMap[s.slotId];
        return s.status === 'booked' && e && e.depositStatus === 'held';
      }
      if (_bkFilter === 'pending') {
        var ep = _escrowMap[s.slotId];
        if (s.status !== 'booked' || !ep || ep.depositStatus !== 'held') return false;
        return ((parseFloat(ep.fullAmount) || 0) - (parseFloat(ep.depositAmount) || 0)) > 0;
      }
      if (_bkFilter === 'refund') {
        var er = _escrowMap[s.slotId];
        return er && er.depositStatus === 'refund_requested';
      }
      return true;
    });

    /* 2 — Date range filter */
    if (_bkDateFrom) {
      filtered = filtered.filter(function(s) { return (s.date || '') >= _bkDateFrom; });
    }
    if (_bkDateTo) {
      filtered = filtered.filter(function(s) { return (s.date || '') <= _bkDateTo; });
    }

    /* Clear list */
    var oldItems = list.querySelectorAll('.wallet-tx-item, .fin-day-divider');
    for (var ri = 0; ri < oldItems.length; ri++) oldItems[ri].remove();

    /* Update active label + count header */
    var KPI_LABELS = {
      'confirmed': '\u2605 Verdient & ausgezahlt',
      'held':      '\u23f8 Deposit gehalten',
      'pending':   '\u2192 F\u00e4llig bei Best\u00e4tigung',
      'future':    '\uD83D\uDCC5 Geplanter Umsatz',
      'refund':    '\u21a9 Ausstehende Refunds'
    };
    var activeLabel = document.getElementById('fin-bk-active-label');
    var countEl     = document.getElementById('fin-bk-count');
    if (activeLabel) activeLabel.textContent = _activeKpi ? (KPI_LABELS[_activeKpi] || '') : '';

    if (!filtered.length) {
      if (countEl) countEl.textContent = '0 Buchungen';
      if (empty) empty.classList.remove('is-hidden');
      return;
    }
    if (empty) empty.classList.add('is-hidden');

    /* 3 — Group by date, then merge consecutive slots per student */
    var byDate = {};
    var dateOrder = [];
    filtered.forEach(function(slot) {
      var d = slot.date || 'unknown';
      if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
      byDate[d].push(slot);
    });
    dateOrder.sort(function(a, b) { return b.localeCompare(a); }); /* newest first */

    var totalBlocks = 0;

    dateOrder.forEach(function(date) {
      var daySlots = byDate[date];
      var dayTotal = daySlots.reduce(function(sum, s) { return sum + (parseFloat(s.price) || 0); }, 0);

      /* Reuse mergeBookingBlocks from ui.js (global) to group consecutive slots */
      var blocks;
      if (typeof mergeBookingBlocks === 'function') {
        blocks = mergeBookingBlocks(date, daySlots, _today, {
          groupField:   'studentId',
          resolveParty: function(slot) { return { studentId: slot.studentId }; }
        });
      } else {
        /* Fallback: each slot is its own block */
        blocks = daySlots.map(function(s) {
          return {
            start: s.time,         /* UTC — kept for grouping logic */
            end:   AppService.slotEndTime(s.time),
            displayStart: _tFinTime(s.time, s.date),
            displayEnd:   _tFinEndTime(s.time, s.date),
            bookedSlots: [s],
            studentId: s.studentId,
            isFullyConfirmed: s.status === 'confirmed'
          };
        });
      }

      totalBlocks += blocks.length;

      /* Day divider */
      var divider = document.createElement('li');
      divider.className = 'fin-day-divider';
      divider.innerHTML =
        '<span class="fin-day-label">' + _esc(_fmtDate(date)) + '</span>' +
        '<span class="fin-day-total">' + _esc(_fmt(dayTotal)) + '</span>';
      list.appendChild(divider);

      /* One row per merged time block */
      blocks.forEach(function(block) {
        var slots      = block.bookedSlots || [];
        var slotCount  = slots.length;
        var blockTotal = slots.reduce(function(sum, s) { return sum + (parseFloat(s.price) || 0); }, 0);
        var isConf     = block.isFullyConfirmed || slots.every(function(s) { return s.status === 'confirmed'; });
        var stuId      = block.studentId || (slots[0] && slots[0].studentId) || '';
        var sName      = ProfileStore.getDisplayName(stuId) || stuId || '\u2014';
        var timeRange  = (block.displayStart || block.start) + '\u2013' + (block.displayEnd || block.end);
        var slotLabel  = slotCount > 1 ? (' \u00b7 ' + slotCount + ' Slots') : '';

        /* KPI extra info uses first slot's escrow */
        var esc = slots[0] ? _escrowMap[slots[0].slotId] : null;
        var extraInfo = '';
        if (_bkFilter === 'held') {
          var heldTotal = slots.reduce(function(sum, s) {
            var e2 = _escrowMap[s.slotId]; return sum + (e2 ? (parseFloat(e2.depositAmount) || 0) : 0);
          }, 0);
          if (heldTotal > 0) extraInfo = 'Deposit: ' + _fmt(heldTotal);
        } else if (_bkFilter === 'pending' && esc) {
          var rest = (parseFloat(esc.fullAmount) || 0) - (parseFloat(esc.depositAmount) || 0);
          extraInfo = 'Noch f\u00e4llig: ' + _fmt(rest);
        } else if (_bkFilter === 'refund' && esc) {
          extraInfo = 'Refund ausstehend: ' + _fmt(esc.depositAmount);
        }

        var li = document.createElement('li');
        li.className = 'wallet-tx-item fin-bk-row';
        li.innerHTML =
          '<div class="wallet-tx-icon ' + (isConf ? 'lesson_confirmed' : 'booking') + '" aria-hidden="true">' +
            (isConf ? '\u2605' : '\u2713') +
          '</div>' +
          '<div class="wallet-tx-body">' +
            '<div class="wallet-tx-row1">' +
              '<span class="wallet-tx-type">' + _esc(sName) + '</span>' +
              '<span class="wallet-tx-amount positive">' + _esc(_fmt(blockTotal)) + '</span>' +
            '</div>' +
            '<div class="wallet-tx-row2">' +
              '<span class="wallet-tx-date">' + _esc(timeRange) + _esc(slotLabel) + '</span>' +
              '<span class="wallet-tx-balance">' +
                (isConf
                  ? '<span class="fin-status-confirmed">\u2713 Best\u00e4tigt</span>'
                  : '<span class="fin-status-pending">\u23f3 Unbest\u00e4tigt</span>') +
              '</span>' +
            '</div>' +
            (extraInfo ? '<div class="wallet-tx-desc fin-extra-info">' + _esc(extraInfo) + '</div>' : '') +
          '</div>';
        list.appendChild(li);
      });
    });

    if (countEl) countEl.textContent =
      totalBlocks + ' Block' + (totalBlocks !== 1 ? 's' : '') +
      ' (' + filtered.length + ' Slot' + (filtered.length !== 1 ? 's' : '') + ')';
  }


  /* ── Transaction history ───────────────────────── */
  var TX_ICONS_MAP = {
    deposit: '\u2191', withdrawal: '\u2193', refund: '\u21a9',
    cancellation: '\u2715', escrow_hold: '\u23f8', escrow_release: '\u25b6',
    booking: '\u2713', move: '\u21c4', teacher_cancel: '\u2715',
    lesson_confirmed: '\u2605', transfer: '\u21c4'
  };
  var TX_LABELS_MAP = {
    deposit: 'Einzahlung', withdrawal: 'Auszahlung', refund: 'R\u00fcckerstattung',
    cancellation: 'Stornierung', teacher_cancel: 'Lehrer-Stornierung',
    escrow_hold: 'Deposit reserviert', escrow_release: 'Zahlung freigegeben',
    booking: 'Buchung', move: 'Verschiebung', lesson_confirmed: 'Stunde best\u00e4tigt',
    transfer: '\u00dcberweisung'
  };

  function renderTxHistory() {
    var list  = document.getElementById('fin-tx-list');
    var empty = document.getElementById('fin-tx-empty');
    if (!list) return;

    /* Type filter */
    var filtered = _txFilter === 'all'
      ? _txs.slice()
      : _txs.filter(function(t) { return t.type === _txFilter; });

    /* Date range filter */
    if (_txDateFrom) {
      filtered = filtered.filter(function(t) {
        return (t.createdAt || '').slice(0, 10) >= _txDateFrom;
      });
    }
    if (_txDateTo) {
      filtered = filtered.filter(function(t) {
        return (t.createdAt || '').slice(0, 10) <= _txDateTo;
      });
    }

    filtered.sort(function(a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    var items = list.querySelectorAll('.wallet-tx-item');
    for (var ri = 0; ri < items.length; ri++) items[ri].remove();

    if (!filtered.length) {
      if (empty) empty.classList.remove('is-hidden');
      return;
    }
    if (empty) empty.classList.add('is-hidden');

    filtered.forEach(function(tx) {
      var txType = tx.type || 'deposit';
      var isPos  = (parseFloat(tx.amount) || 0) >= 0;
      var icon   = TX_ICONS_MAP[txType]  || '\u00b7';
      var label  = TX_LABELS_MAP[txType] || txType;
      var related = tx.relatedUid ? (ProfileStore.getDisplayName(tx.relatedUid) || tx.relatedUid) : '';
      var balStr = (typeof _fmtForUser !== 'undefined' && typeof currentUser !== 'undefined' && currentUser)
        ? _fmtForUser(parseFloat(tx.balance) || 0, currentUser.uid)
        : (parseFloat(tx.balance) || 0).toFixed(2).replace('.', ',') + ' \u20ac';
      var li = document.createElement('li');
      li.className = 'wallet-tx-item';
      li.style.cursor = 'default';
      li.innerHTML =
        '<div class="wallet-tx-icon ' + _esc(txType) + '" aria-hidden="true">' + icon + '</div>' +
        '<div class="wallet-tx-body">' +
          '<div class="wallet-tx-row1">' +
            '<span class="wallet-tx-type">' + _esc(label) + '</span>' +
            '<span class="wallet-tx-amount ' + (isPos ? 'positive' : 'negative') + '">' +
              _esc((isPos ? '+' : '') + ((typeof _fmtForUser !== 'undefined' && typeof currentUser !== 'undefined' && currentUser)
                ? _fmtForUser(parseFloat(tx.amount) || 0, currentUser.uid)
                : (parseFloat(tx.amount) || 0).toFixed(2).replace('.', ',') + ' \u20ac')) +
            '</span>' +
          '</div>' +
          '<div class="wallet-tx-row2">' +
            '<span class="wallet-tx-date">' + _fmtDt(tx.createdAt) +
              (related ? ' \u00b7 ' + _esc(related) : '') + '</span>' +
            '<span class="wallet-tx-balance">' + _esc(balStr) + '</span>' +
          '</div>' +
          (tx.description ? '<div class="wallet-tx-desc">' + _esc(tx.description.slice(0, 70)) + '</div>' : '') +
        '</div>';
      list.appendChild(li);
    });

    /* Wire search to filter booking rows by student name */
    wireSearchInput('fin-bk-search', function(query) {
      var q    = (query || '').trim().toLowerCase();
      var rows = list.querySelectorAll('.fin-bk-row');
      for (var si = 0; si < rows.length; si++) {
        var nameEl = rows[si].querySelector('.wallet-tx-type');
        var label  = nameEl ? nameEl.textContent.toLowerCase() : '';
        rows[si].classList.toggle('is-hidden', !q || label.indexOf(q) === -1);
      }
    });
  }

}());
