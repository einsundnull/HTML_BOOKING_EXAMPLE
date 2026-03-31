/**
 * dashboard.js — Upcoming Lessons Dashboard
 *
 * Supports teacher and student roles.
 * Merges consecutive slots per party, groups by date + month.
 * Click on a card opens an action dialog via Modal.show().
 *
 * Rules: var only, function(){}, no arrow functions,
 *        no template literals, no ?. or ??
 *        All DOM via createElement/appendChild — no innerHTML with IDs.
 */

/* ── i18n ──────────────────────────────────────────────── */
var _dashI18n        = {};
var _dashCurrentUser = null;

/* ── Dashboard time helper: UTC → user local (supports teacher + student) ── */
function _tDashTime(utcTimeStr, dateStr) {
  if (!utcTimeStr || typeof TimezoneService === 'undefined' || !_dashCurrentUser) return utcTimeStr || '';
  var tz = TimezoneService.getUserTimezone(_dashCurrentUser.uid);
  return TimezoneService.utcToLocal(utcTimeStr, dateStr || '', tz).localTime;
}
function _tDashEndTime(utcTimeStr, dateStr) {
  return AppService.slotEndTime(_tDashTime(utcTimeStr, dateStr));
}
var _dashToday       = '';

function _loadDashI18n(cb) {
  var v   = typeof APP_VERSION !== 'undefined' ? ('?v=' + APP_VERSION) : '';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', './locales/dashboard.json' + v);
  xhr.onload = function() {
    try { _dashI18n = JSON.parse(xhr.responseText); } catch(e) { _dashI18n = {}; }
    cb();
  };
  xhr.onerror = function() { _dashI18n = {}; cb(); };
  xhr.send();
}

var _DASH_I18N_DEFAULTS = {
  pageTitle:    'Dashboard',
  pageSubtitle: 'Deine nächsten Stunden auf einen Blick.',
  statToday:    'Heute',
  statWeek:     'Diese Woche',
  statTotal:    'Kommende',
  statStudents: 'Schüler',
  statTeachers:  'Lehrer',
  statBooked:   'Buchungen',
  calendarBtn:  'Kalender öffnen',
  emptySchedule:'Keine kommenden Stunden.',
  loading:      'Wird geladen…',
  dialogTitle:  'Stunde',
  actionContact:'Kontaktieren',
  actionDetails:'Buchungsdetails',
  actionConfirm:'Bestätigen',
  actionMove:   'Verlegen',
  actionCancel: 'Stornieren',
  actionRelease:'Freigeben',
  actionClose:  'Schließen',
  actionRecur:  'Regelmäßig buchen',
  toastConfirmed:'Stunde bestätigt.',
  toastMoved:   'Stunde verschoben.',
  toastReleased:'Slots freigegeben.'
};

function _t(key) {
  if (_dashI18n && _dashI18n[key]) return _dashI18n[key];
  return _DASH_I18N_DEFAULTS[key] || key;
}

/* ── Date helpers ──────────────────────────────────────── */
function _fmtDateKey(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
function _todayKey()         { return _fmtDateKey(new Date()); }
function _monthKey(dateStr)  { return dateStr.slice(0, 7); }

function _monthLabel(monthKey) {
  var parts = monthKey.split('-');
  var d     = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}
function _weekday(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short' });
}
function _dayNum(dateStr)   { return parseInt(dateStr.split('-')[2], 10); }
function _longDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/* ── Status icon SVGs (12×12, stroke-based, no fill) ─────── */
var _ICONS = {
  /* Kreis mit Häkchen: Bestätigt (Zukunft) */
  confirmed: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 6l1.8 1.8 3-3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* Analoguhr Zeiger auf 3: Ausstehend */
  pending:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M6 3.5V6l2 1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* Ausgefüllter Häkchen-Kreis: Abgeschlossen (Vergangenheit, bestätigt) */
  done:      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.5"/><path d="M3.5 6l1.8 1.8 3-3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* Sanduhr: Vergangen + unbestätigt */
  overdue:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 1.5h6M3 10.5h6M4 1.5C4 4 8 5 8 6S4 8 4 10.5M8 1.5C8 4 4 5 4 6s4 2 4 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/*
 * _buildStatusBadge — icon-only badge with aria-label tooltip
 * state: 'confirmed' | 'pending' | 'done' | 'overdue'
 */
function _buildStatusBadge(state) {
  var cfg = {
    confirmed: { cls: 'dash-badge--confirmed', label: 'Bestätigt'        },
    pending:   { cls: 'dash-badge--pending',   label: 'Ausstehend'       },
    done:      { cls: 'dash-badge--done',      label: 'Abgeschlossen'    },
    overdue:   { cls: 'dash-badge--overdue',   label: 'Nicht bestätigt'  }
  };
  var c = cfg[state] || cfg.pending;
  var wrap = document.createElement('span');
  wrap.className = 'dash-badge ' + c.cls;
  wrap.setAttribute('aria-label', c.label);
  wrap.setAttribute('title', c.label);
  wrap.innerHTML = _ICONS[state] || _ICONS.pending;
  return wrap;
}

/* ── Data loading ──────────────────────────────────────── */
function _loadSlots(currentUser) {
  var slots = currentUser.role === 'teacher'
    ? AppService.getSlotsByTeacherSync(currentUser.uid)
    : AppService.getSlotsByStudentSync(currentUser.uid);
  slots = slots.filter(function(s) { return s.studentId && s.status === 'booked'; });
  slots.sort(function(a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  return slots;
}

/* ── Merge consecutive slots into blocks ───────────────── */
function _mergeBlocks(dateStr, slots, currentUser) {
  if (currentUser.role === 'teacher') {
    /* Teacher: group by sorted student-set key (same logic as teacher.js) */
    var keyed = slots.map(function(s) {
      var sids = (s.students && s.students.length) ? s.students.slice() : (s.studentId ? [s.studentId] : []);
      sids.sort();
      var clone = {};
      for (var k in s) clone[k] = s[k];
      clone._groupKey = sids.join('|') || s.slotId;
      return clone;
    });
    return mergeBookingBlocks(dateStr, keyed, _dashToday, {
      groupField:   '_groupKey',
      resolveParty: function(slot) {
        return { otherUid: slot.studentId, otherRole: 'student' };
      },
      viewerUid:    currentUser.uid
    });
  }
  /* Student: group by teacherId — unchanged */
  return mergeBookingBlocks(dateStr, slots, _dashToday, {
    groupField:   'teacherId',
    resolveParty: function(slot) {
      return { otherUid: slot.teacherId, otherRole: 'teacher' };
    },
    viewerUid:    currentUser.uid
  });
}

/* ── Enrich block slots from full store ─────────────────── */
function _enrichSlots(block) {
  var all = AppService.getAllSlotsSync();
  return (block.bookedSlots || []).map(function(stub) {
    for (var i = 0; i < all.length; i++) {
      if (all[i].slotId === stub.slotId) return all[i];
    }
    return stub;
  });
}

/* ── Build booking snapshot for ChatPanel.showBookingDetails ── */
function _buildSnapFromBlock(block) {
  var slots        = _enrichSlots(block);
  var firstSlot    = slots[0] || {};
  var teacherId    = firstSlot.teacherId || '';
  var studentId    = firstSlot.studentId || '';
  var pricePerSlot = parseFloat(firstSlot.price) ||
                     parseFloat(ProfileStore.getPrice(teacherId)) || 0;
  var dateObj   = new Date(block.dateStr + 'T00:00:00');
  var dateLabel = dateObj.toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  var slotTimes = slots.map(function(s) { return { time: _tDashTime(s.time, s.date) }; });
  var slotIds   = slots.map(function(s) { return s.slotId; });
  var amount    = pricePerSlot * slots.length;
  return {
    teacherId:    teacherId,
    teacherName:  ProfileStore.getDisplayName(teacherId),
    studentId:    studentId,
    studentName:  ProfileStore.getDisplayName(studentId),
    pricePerSlot: pricePerSlot,
    totalSlots:   slots.length,
    totalAmount:  amount,
    blocks: [{
      dateLabel: dateLabel,
      timeStart: block.start,
      timeEnd:   block.end,
      slotCount: slots.length,
      slotIds:   slotIds,
      slotTimes: slotTimes,
      amount:    amount
    }]
  };
}

/* ── Re-render after mutations ──────────────────────────── */
var _nowLineInterval = null;

function _rerender() {
  var scheduleEl = document.getElementById('dash-schedule');
  var statsEl    = document.getElementById('dash-stats-row');
  if (scheduleEl) scheduleEl.innerHTML = '';
  if (statsEl)    statsEl.innerHTML    = '';
  var slots = _loadSlots(_dashCurrentUser);
  _buildStats(slots, _dashCurrentUser, _dashToday);
  _buildSchedule(slots, _dashCurrentUser);
  if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(_dashCurrentUser.uid);
}

/* ── Now Line ────────────────────────────────────────────── */
function _currentTimeStr() {
  var now = new Date();
  var h   = String(now.getHours()).padStart(2, '0');
  var m   = String(now.getMinutes()).padStart(2, '0');
  return h + ':' + m;
}

function _buildNowLineEl(timeStr) {
  var wrap = document.createElement('div');
  wrap.className = 'dash-now-line';
  wrap.id        = 'dash-now-line';
  wrap.setAttribute('aria-hidden', 'true');

  var dot = document.createElement('div');
  dot.className = 'dash-now-line-dot';

  var bar = document.createElement('div');
  bar.className = 'dash-now-line-bar';

  var lbl = document.createElement('div');
  lbl.className  = 'dash-now-line-label';
  lbl.textContent = timeStr;

  wrap.appendChild(dot);
  wrap.appendChild(bar);
  wrap.appendChild(lbl);
  return wrap;
}

/*
 * _insertNowLine — inserts the now-line into slotsCol for today.
 * blocks[] is sorted by start time.
 * Positions:
 *   before all blocks    → prepend
 *   between block i+1    → after cards[i]
 *   after all blocks     → don't insert (today is done)
 *   during a block       → after that block's card
 */
function _insertNowLine(slotsCol, blocks) {
  var now = _currentTimeStr();

  /* Remove old line if present */
  var old = slotsCol.querySelector('.dash-now-line');
  if (old) old.parentNode.removeChild(old);

  /* Find insertion position */
  var insertAfterIndex = -2; /* -2 = before all, -1 = don't show (all past) */
  for (var i = 0; i < blocks.length; i++) {
    var bStart = blocks[i].start;
    var bEnd   = blocks[i].end;
    if (now < bStart) {
      /* Now is before this block — insert before it */
      insertAfterIndex = i - 1;
      break;
    }
    if (now >= bStart && now < bEnd) {
      /* Now is inside this block — insert after it */
      insertAfterIndex = i;
      break;
    }
    /* now >= bEnd → past this block, keep looking */
    insertAfterIndex = -1; /* tentatively "all past" */
  }

  if (insertAfterIndex === -1) return; /* all blocks are in the past — no line */

  var lineEl    = _buildNowLineEl(now);
  var cardEls   = slotsCol.querySelectorAll('.dash-lesson');

  if (insertAfterIndex === -2 || cardEls.length === 0) {
    /* Before all cards */
    slotsCol.insertBefore(lineEl, slotsCol.firstChild);
  } else {
    /* After card at insertAfterIndex */
    var afterCard = cardEls[insertAfterIndex];
    if (afterCard && afterCard.nextSibling) {
      slotsCol.insertBefore(lineEl, afterCard.nextSibling);
    } else {
      slotsCol.appendChild(lineEl);
    }
  }
}

function _startNowLineTick() {
  if (_nowLineInterval) clearInterval(_nowLineInterval);
  _nowLineInterval = setInterval(function() {
    var slotsCol = document.getElementById('dash-today-slots');
    if (!slotsCol || !slotsCol._dashBlocks) return;
    _insertNowLine(slotsCol, slotsCol._dashBlocks);
    /* Update label text on existing line */
  }, 60000); /* update every minute */
}

/* ── Stats ──────────────────────────────────────────────── */
/* ── Count booking blocks (reuses same logic as mergeBookingBlocks in ui.js)
   A block = consecutive slots with same party (studentId for teacher,
   teacherId for student) on the same date.
   groupField: 'studentId' (teacher view) | 'teacherId' (student view)  */
function _countBookingBlocks(bookedSlots, groupField) {
  if (!groupField) groupField = 'studentId';
  var isTeacherView = groupField === 'studentId';
  /* For teacher: build _groupKey (sorted student UIDs) so multi-student slots count correctly */
  var processed = bookedSlots.map(function(s) {
    if (!isTeacherView) return s;
    var sids = (s.students && s.students.length) ? s.students.slice() : (s.studentId ? [s.studentId] : []);
    sids.sort();
    var clone = {};
    for (var k in s) clone[k] = s[k];
    clone._groupKey = sids.join('|') || s.slotId;
    return clone;
  });
  var effectiveField = isTeacherView ? '_groupKey' : groupField;
  /* Group by date */
  var byDate = {};
  for (var i = 0; i < processed.length; i++) {
    var d = processed[i].date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(processed[i]);
  }
  var total = 0;
  var dates = Object.keys(byDate);
  for (var di = 0; di < dates.length; di++) {
    var daySlots = byDate[dates[di]].slice().sort(function(a, b) {
      return (a[effectiveField] || '').localeCompare(b[effectiveField] || '') || a.time.localeCompare(b.time);
    });
    var idx = 0;
    while (idx < daySlots.length) {
      var s   = daySlots[idx];
      var end = AppService.slotEndTime(s.time);
      var j   = idx + 1;
      while (j < daySlots.length) {
        var next = daySlots[j];
        if (next[effectiveField] === s[effectiveField] && next.time <= end) {
          var nextEnd = AppService.slotEndTime(next.time);
          if (nextEnd > end) end = nextEnd;
          j++;
        } else { break; }
      }
      total++;
      idx = j;
    }
  }
  return total;
}

function _buildStats(slots, currentUser, today) {
  var statsRow = document.getElementById('dash-stats-row');
  if (!statsRow) return;

  var weekEnd    = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  var weekEndKey = _fmtDateKey(weekEnd);

  /* Booked = slots with a student assigned */
  var booked = slots.filter(function(s) { return s.studentId; });

  /* Unique counterparts (students for teacher, teachers for student) */
  var partyMap = {};
  var isTeacher  = currentUser && currentUser.role === 'teacher';
  var groupField = isTeacher ? 'studentId' : 'teacherId';
  for (var i = 0; i < booked.length; i++) {
    var partyId = isTeacher ? booked[i].studentId : booked[i].teacherId;
    if (partyId) partyMap[partyId] = true;
  }
  var partyLabel = isTeacher ? _t('statStudents') : _t('statTeachers');

  var defs = [
    { label: _t('statToday'),    value: _countBookingBlocks(slots.filter(function(s){ return s.date === today; }), groupField) },
    { label: _t('statWeek'),     value: _countBookingBlocks(slots.filter(function(s){ return s.date >= today && s.date <= weekEndKey; }), groupField) },
    { label: _t('statTotal'),    value: _countBookingBlocks(slots.filter(function(s){ return s.date >= today; }), groupField) },
    { label: partyLabel,         value: Object.keys(partyMap).length },
    { label: _t('statBooked'),   value: _countBookingBlocks(booked, groupField) }
  ];

  statsRow.innerHTML = '';
  for (var j = 0; j < defs.length; j++) {
    var card = document.createElement('div'); card.className = 'stat-card';
    var lbl  = document.createElement('div'); lbl.className  = 'stat-label'; lbl.textContent = defs[j].label;
    var val  = document.createElement('div'); val.className  = 'stat-value'; val.textContent = defs[j].value;
    card.appendChild(lbl); card.appendChild(val); statsRow.appendChild(card);
  }

  /* Wire calendar quick-link */
  var calBtn = document.getElementById('dash-calendar-link');
  if (calBtn && currentUser) {
    calBtn.href = './teacher.html?uid=' + encodeURIComponent(currentUser.uid);
  }
}

/* ── Block card ──────────────────────────────────────────── */
function _buildBlockCard(block, currentUser) {
  var card = document.createElement('div');
  card.className = 'dash-lesson';
  var isPast      = block.dateStr < _dashToday;
  var isConfirmed = block.isFullyConfirmed;
  if (isPast)           card.classList.add('dash-lesson--past');
  else if (isConfirmed) card.classList.add('dash-lesson--confirmed');
  else                  card.classList.add('dash-lesson--pending');

  /* Determine badge state */
  var badgeState;
  if (isPast && isConfirmed)       badgeState = 'done';
  else if (isPast && !isConfirmed) badgeState = 'overdue';
  else if (isConfirmed)            badgeState = 'confirmed';
  else                             badgeState = 'pending';

  /* Avatar */
  var avatarWrap = document.createElement('div');
  avatarWrap.className = 'dash-lesson-avatar';
  avatarWrap.innerHTML = buildAvatarHTML(block.otherUid, { size: 'sm', role: block.otherRole });

  /* Body */
  var body   = document.createElement('div'); body.className = 'dash-lesson-body';
  var nameEl = document.createElement('div'); nameEl.className = 'dash-lesson-name';
  nameEl.textContent = ProfileStore.getDisplayName(block.otherUid);

  var timeEl = document.createElement('div'); timeEl.className = 'dash-lesson-time';
  timeEl.textContent = block.start + ' \u2013 ' + block.end;

  /* Slot count badge for merged blocks */
  if (block.bookedSlots && block.bookedSlots.length > 1) {
    var dot    = document.createTextNode(' \u00b7 ');
    var cntEl  = document.createElement('span');
    cntEl.className = 'dash-lesson-count';
    cntEl.textContent = block.bookedSlots.length + ' Slots';
    timeEl.appendChild(dot);
    timeEl.appendChild(cntEl);
  }

  body.appendChild(nameEl); body.appendChild(timeEl);

  /* Status badge (icon only) */
  var badge = _buildStatusBadge(badgeState);

  card.appendChild(body);
  card.appendChild(badge);
  card.appendChild(avatarWrap);

  /* Click → action dialog */
  (function(b) {
    card.addEventListener('click', function() { _openBlockDialog(b, currentUser); });
  }(block));

  return card;
}

/* ── Block action dialog ─────────────────────────────────── */
function _openBlockDialog(block, currentUser) {
  var isPast      = block.dateStr < _dashToday;
  var isConfirmed = block.isFullyConfirmed;
  var otherUid    = block.otherUid;
  var otherRole   = block.otherRole;
  var otherName   = ProfileStore.getDisplayName(otherUid);
  var slotCount   = block.bookedSlots ? block.bookedSlots.length : 1;
  var firstSlot   = block.bookedSlots ? block.bookedSlots[0] : {};

  /* Determine badge state */
  var badgeState;
  if (isPast && isConfirmed)       badgeState = 'done';
  else if (isPast && !isConfirmed) badgeState = 'overdue';
  else if (isConfirmed)            badgeState = 'confirmed';
  else                             badgeState = 'pending';

  /* Status badge HTML (icon + label text for dialog — more space here) */
  var badgeCfg = {
    confirmed: { cls: 'dash-badge dash-badge--confirmed dash-badge--label', icon: _ICONS.confirmed, label: 'Bestätigt'       },
    pending:   { cls: 'dash-badge dash-badge--pending   dash-badge--label', icon: _ICONS.pending,   label: 'Ausstehend'      },
    done:      { cls: 'dash-badge dash-badge--done      dash-badge--label', icon: _ICONS.done,      label: 'Abgeschlossen'   },
    overdue:   { cls: 'dash-badge dash-badge--overdue   dash-badge--label', icon: _ICONS.overdue,   label: 'Nicht bestätigt' }
  };
  var bc = badgeCfg[badgeState];
  var statusBadge = '<span class="' + bc.cls + '">' + bc.icon + ' ' + _esc(bc.label) + '</span>';

  /* Action rules:
     - Verlegen / Stornieren: NUR wenn Zukunft UND unbestätigt
     - Bestätigen:            NUR wenn Zukunft UND unbestätigt
     - Freigeben (Lehrer):    NUR wenn Zukunft UND bestätigt
     - Kontaktieren:          immer
  */
  var canConfirm = !isPast && !isConfirmed;
  var canMove    = !isPast && !isConfirmed;
  var canCancel  = !isPast && !isConfirmed;
  var canRelease = !isPast && isConfirmed && currentUser.role === 'teacher';
  /* Recurring booking is student-only — teachers set single lessons */
  var canRecur   = false;

  var bodyHTML =
    '<div class="dash-dialog">' +
      '<div class="dash-dialog-party">' +
        '<div class="dash-dialog-avatar">' + buildAvatarHTML(otherUid, { size: 'md', role: otherRole }) + '</div>' +
        '<div class="dash-dialog-info">' +
          '<div class="dash-dialog-name">' + _esc(otherName) + '</div>' +
          '<div class="dash-dialog-date">' + _esc(_longDate(block.dateStr)) + '</div>' +
          '<div class="dash-dialog-time">' + _esc(block.start + ' \u2013 ' + block.end) +
            ' &middot; ' + slotCount + ' Slot' + (slotCount !== 1 ? 's' : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-dialog-status">' + statusBadge + '</div>' +
      '<div class="dash-dialog-actions">' +
        /* Contact — always */
        '<button class="btn btn-secondary dash-dialog-btn" id="dash-act-contact">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H4l-3 3V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
          _t('actionContact') +
        '</button>' +
        /* Booking details — always */
        '<button class="btn btn-secondary dash-dialog-btn" id="dash-act-details">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          _t('actionDetails') +
        '</button>' +
        /* Confirm */
        (canConfirm
          ? '<button class="btn btn-primary dash-dialog-btn" id="dash-act-confirm">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              _t('actionConfirm') + '</button>'
          : '') +
        /* Move */
        (canMove
          ? '<button class="btn btn-secondary dash-dialog-btn" id="dash-act-move">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              _t('actionMove') + '</button>'
          : '') +
        (canRecur
          ? '<button class="btn btn-secondary dash-dialog-btn" id="dash-act-recur">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0111.46-2.46M14 8a6 6 0 01-11.46 2.46" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              _t('actionRecur') + '</button>'
          : '') +
        /* Cancel */
        (canCancel
          ? '<button class="btn btn-danger dash-dialog-btn" id="dash-act-cancel">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
              _t('actionCancel') + '</button>'
          : '') +
        /* Release */
        (canRelease
          ? '<button class="btn btn-secondary dash-dialog-btn" id="dash-act-release">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0110.47-3.99M14 8a6 6 0 01-10.47 3.99M10 2l2 2-2 2M6 14l-2-2 2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              _t('actionRelease') + '</button>'
          : '') +
      '</div>' +
    '</div>';

  var result = Modal.show({
    title:      _t('dialogTitle'),
    bodyHTML:   bodyHTML,
    footerHTML: '<button class="btn btn-ghost" id="dash-act-close">' + _t('actionClose') + '</button>'
  });

  /* Wire buttons */
  var closeBtn = document.getElementById('dash-act-close');
  if (closeBtn) closeBtn.addEventListener('click', result.close);

  /* Contact */
  var contactBtn = document.getElementById('dash-act-contact');
  if (contactBtn) {
    contactBtn.addEventListener('click', function() {
      result.close();
      if (typeof ChatPanel !== 'undefined' && ChatPanel.openWith) {
        ChatPanel.openWith(otherUid);
      }
    });
  }

  /* Booking details */
  var detailsBtn = document.getElementById('dash-act-details');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', function() {
      result.close();
      if (typeof ChatPanel !== 'undefined' && ChatPanel.showBookingDetails) {
        var snap = _buildSnapFromBlock(block);
        ChatPanel.showBookingDetails(snap, _dashCurrentUser.uid);
      }
    });
  }
  var confirmBtn = document.getElementById('dash-act-confirm');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', function() {
      result.close();
      var fullSlots = _enrichSlots(block);
      AppService.confirmBlock(fullSlots, function(e) {
        if (e) { Toast.error(e.message || e); return; }
        Toast.success(_t('toastConfirmed'));
        _rerender();
      });
    });
  }

  /* Move */
  var moveBtn = document.getElementById('dash-act-move');
  if (moveBtn) {
    moveBtn.addEventListener('click', function() {
      result.close();
      /* Build synthetic block for openMoveBlockDialogShared */
      var synBlock = {};
      for (var k in block) synBlock[k] = block[k];
      synBlock.student = { uid: firstSlot.studentId };
      synBlock.teacher = { uid: firstSlot.teacherId };

      openMoveBlockDialogShared({
        block:       synBlock,
        teacherId:   firstSlot.teacherId,
        actorRole:   currentUser.role,
        pendingMap:  {},
        stuId:       firstSlot.studentId,
        displayName: otherName,
        onConfirm: function(pending, dialogOpts) {
          var moveOpts   = (dialogOpts && dialogOpts._lastMoveOpts) ? dialogOpts._lastMoveOpts : {};
          var cancelMap  = {};
          var bookMap    = {};
          var keys       = Object.keys(pending);
          for (var pi = 0; pi < keys.length; pi++) {
            var p = pending[keys[pi]];
            if (!p.originalSlot) continue;
            var pk = currentUser.role === 'teacher' ? p.originalSlot.studentId : p.originalSlot.teacherId;
            if (!pk) continue;
            if (p.action === 'cancel')      cancelMap[pk] = p.originalSlot;
            else if (p.action === 'book')   bookMap[pk]   = p.originalSlot;
          }
          Object.keys(cancelMap).forEach(function(pk) {
            if (!bookMap[pk]) return;
            var oldS = cancelMap[pk];
            var newS = bookMap[pk];
            AppService.writeMoveRecord(oldS, newS, currentUser.uid, currentUser.role, function(err) {
              if (err) return;
              if (typeof ChatStore !== 'undefined' && ChatStore.sendMoveNotification) {
                var snap = {
                  actorId: currentUser.uid, actorRole: currentUser.role,
                  actorName:   ProfileStore.getDisplayName(currentUser.uid),
                  teacherId:   oldS.teacherId, studentId: oldS.studentId,
                  teacherName: ProfileStore.getDisplayName(oldS.teacherId),
                  studentName: ProfileStore.getDisplayName(oldS.studentId),
                  oldDate: oldS.date, oldTime: _tDashTime(oldS.time, oldS.date),
                  oldEndTime: _tDashEndTime(oldS.time, oldS.date),
                  newDate: newS.date, newTime: _tDashTime(newS.time, newS.date),
                  newEndTime: _tDashEndTime(newS.time, newS.date),
                  reason: moveOpts.reason || '', reasonLabel: moveOpts.reasonLabel || '',
                  note:   moveOpts.note   || ''
                };
                var receiver = (currentUser.role === 'teacher') ? oldS.studentId : oldS.teacherId;
                ChatStore.sendMoveNotification(currentUser.uid, receiver, snap);
              }
              Toast.success(_t('toastMoved'));
              _rerender();
            }, moveOpts);
          });
        },
        onConfirmBlock: function() { _rerender(); },
        onCancelBlock:  function() { _rerender(); },
        onCalJump:      function() {}
      });
    });
  }

  /* Cancel */
  var cancelBtn = document.getElementById('dash-act-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      result.close();
      var slots = _enrichSlots(block);
      _showCancelBlockPolicyDialog(
        slots, {}, function() { _rerender(); },
        ProfileStore.getDisplayName(firstSlot.teacherId),
        block.start, block.end, block.dateStr, currentUser.role
      );
    });
  }

  /* Recurring */
  var recurBtn = document.getElementById('dash-act-recur');
  if (recurBtn) {
    recurBtn.addEventListener('click', function() {
      result.close();
      /* Build bundleSlots from the block's booked slots */
      var enriched   = _enrichSlots(block);
      var anchorSlot = enriched[0] || null;
      if (!anchorSlot) return;
      _openRecurringBookingDialog({
        slot:        anchorSlot,
        bundleSlots: enriched,
        teacherId:   firstSlot.teacherId,
        stuId:       firstSlot.studentId,
        stuIds:      [firstSlot.studentId],
        pendingMap:  {},
        onConfirm:   function(pending) {
          /* Save each pending booking */
          var keys  = Object.keys(pending);
          var done  = 0;
          if (!keys.length) { _rerender(); return; }
          for (var pi = 0; pi < keys.length; pi++) {
            (function(p) {
              if (p.action !== 'book' || !p.originalSlot) { if (++done === keys.length) _rerender(); return; }
              AppService.bookSlotWithEscrowSilent(
                p.originalSlot.slotId, p.newStudentId, p.originalSlot.teacherId,
                function(e) {
                  if (e) Toast.error(e.message || e);
                  if (++done === keys.length) {
                    Toast.success(keys.length + ' Termin' + (keys.length !== 1 ? 'e' : '') + ' gebucht.');
                    _rerender();
                  }
                }, 'teacher'
              );
            })(pending[keys[pi]]);
          }
        }
      });
    });
  }

  /* Release */
  var releaseBtn = document.getElementById('dash-act-release');
  if (releaseBtn) {
    releaseBtn.addEventListener('click', function() {
      result.close();
      var slots = block.bookedSlots || [];
      var done  = 0;
      for (var ri = 0; ri < slots.length; ri++) {
        AppService.releaseSlot(slots[ri].slotId, function(e) {
          if (e) { Toast.error(e.message || e); return; }
          if (++done === slots.length) {
            Toast.success(_t('toastReleased'));
            _rerender();
          }
        });
      }
    });
  }
}

/* ── Schedule list ─────────────────────────────────────── */
function _buildSchedule(slots, currentUser) {
  var container = document.getElementById('dash-schedule');
  if (!container) return;
  var loading = container.querySelector('.dash-loading');
  if (loading) container.removeChild(loading);

  var upcoming = slots.filter(function(s) { return s.date >= _dashToday; });

  if (!upcoming.length) {
    var empty = document.createElement('div');
    empty.className  = 'dash-empty';
    empty.textContent = _t('emptySchedule');
    container.appendChild(empty);
    return;
  }

  /* Group by date */
  var byDate = {};
  var dates  = [];
  for (var i = 0; i < upcoming.length; i++) {
    var s = upcoming[i];
    if (!byDate[s.date]) { byDate[s.date] = []; dates.push(s.date); }
    byDate[s.date].push(s);
  }

  /* Group by month */
  var byMonth = {};
  var months  = [];
  for (var di = 0; di < dates.length; di++) {
    var mk = _monthKey(dates[di]);
    if (!byMonth[mk]) { byMonth[mk] = []; months.push(mk); }
    byMonth[mk].push(dates[di]);
  }

  /* Render */
  for (var mi = 0; mi < months.length; mi++) {
    var mk2    = months[mi];
    var mDates = byMonth[mk2];

    var mHeader = document.createElement('div');
    mHeader.className  = 'dash-month-header';
    mHeader.textContent = _monthLabel(mk2);
    container.appendChild(mHeader);

    for (var ddi = 0; ddi < mDates.length; ddi++) {
      var dateStr  = mDates[ddi];
      var daySlots = byDate[dateStr];
      var blocks   = _mergeBlocks(dateStr, daySlots, currentUser);

      var dayRow = document.createElement('div');
      dayRow.className = 'dash-day';

      var dayLabel = document.createElement('div');
      dayLabel.className = 'dash-day-label';

      var wdEl = document.createElement('div');
      wdEl.className  = 'dash-day-weekday';
      wdEl.textContent = _weekday(dateStr);

      var dnEl = document.createElement('div');
      dnEl.className  = 'dash-day-num' + (dateStr === _dashToday ? ' dash-day-num--today' : '');
      dnEl.textContent = _dayNum(dateStr);

      dayLabel.appendChild(wdEl);
      dayLabel.appendChild(dnEl);

      var slotsCol = document.createElement('div');
      slotsCol.className = 'dash-day-slots';

      for (var bi = 0; bi < blocks.length; bi++) {
        slotsCol.appendChild(_buildBlockCard(blocks[bi], currentUser));
      }

      /* Insert now-line for today */
      if (dateStr === _dashToday) {
        slotsCol.id          = 'dash-today-slots';
        slotsCol._dashBlocks = blocks;
        _insertNowLine(slotsCol, blocks);
        _startNowLineTick();
      }

      dayRow.appendChild(dayLabel);
      dayRow.appendChild(slotsCol);
      container.appendChild(dayRow);
    }
  }
}

/* ── Init ───────────────────────────────────────────────── */
window.addEventListener('load', function() {
  var currentUser = Auth.current();
  if (!currentUser) { window.location.href = './landing.html'; return; }

  _dashCurrentUser = currentUser;
  _dashToday       = _todayKey();

  Navbar.init('dashboard');

  var container = document.getElementById('dash-schedule');
  if (container) {
    var loading = document.createElement('div');
    loading.className  = 'dash-loading';
    loading.textContent = _t('loading');
    container.appendChild(loading);
  }

  _loadDashI18n(function() {
    var titleEl    = document.getElementById('dash-title');
    var subtitleEl = document.getElementById('dash-subtitle');
    if (titleEl)    titleEl.textContent    = _t('pageTitle');
    if (subtitleEl) subtitleEl.textContent = _t('pageSubtitle');

    var slots = _loadSlots(currentUser);
    _buildStats(slots, currentUser, _dashToday);
    _buildSchedule(slots, currentUser);
  });
});
