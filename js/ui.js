/**
 * ui.js — Shared UI Utilities
 * Toast, Modal, Icons — ohne const/let/arrow für maximale Kompatibilität.
 */

/* ── Toast ────────────────────────────────────────────── */
var Toast = (function() {
  var container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type, duration) {
    type     = type     || 'success';
    duration = duration || 4000;

    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'info' ? ' toast-info' : '');

    var iconColor = type === 'success' ? '#4d7aa0' : '#e74c3c';
    var iconPath  = type === 'success'
      ? '<circle cx="8" cy="8" r="7" stroke="' + iconColor + '" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="' + iconColor + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<circle cx="8" cy="8" r="7" stroke="' + iconColor + '" stroke-width="1.5"/><path d="M8 5v3M8 11v.5" stroke="' + iconColor + '" stroke-width="1.5" stroke-linecap="round"/>';

    el.innerHTML = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">' + iconPath + '</svg>'
      + '<div><span>' + message + '</span></div>';

    getContainer().appendChild(el);
    setTimeout(function() {
      el.classList.add('toast-exit');
      el.addEventListener('animationend', function() { el.remove(); });
    }, duration);
  }

  return {
    success: function(msg) { show(msg, 'success'); },
    error:   function(msg) { show(msg, 'error'); },
    info:    function(msg) { show(msg, 'info'); }
  };
})();

/* ── Modal ────────────────────────────────────────────── */
var Modal = {
  show: function(opts) {
    var title      = opts.title      || '';
    var bodyHTML   = opts.bodyHTML   || '';
    var footerHTML = opts.footerHTML || '';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">'
        + '<div class="modal-header">'
          + '<span class="modal-title">' + title + '</span>'
          + '<button class="modal-close" aria-label="Close">'
            + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">'
            + '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
            + '</svg>'
          + '</button>'
        + '</div>'
        + '<div class="modal-body">' + bodyHTML + '</div>'
        + (footerHTML ? '<div class="modal-footer">' + footerHTML + '</div>' : '')
      + '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    function esc(e) {
      if (e.key === 'Escape') close();
    }
    function close() {
      overlay.remove();
      /* Remove modal-open only if no other modals remain */
      if (!document.querySelector('.modal-overlay')) {
        document.body.classList.remove('modal-open');
      }
      document.removeEventListener('keydown', esc);
    }

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', esc);

    return { overlay: overlay, close: close };
  }
};

/* ── Icons ────────────────────────────────────────────── */
var Icons = {
  trash: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus:  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
};


/* ── Shared Move Block Dialog ────────────────────────────
   opts = {
     block:        { dateStr, start, end, bookedSlots:[{slotId}], student:{uid,name} }
     teacherId:    string
     pendingMap:   object  (pendingBookings or pendingDayChanges)
     stuId:        string|null
     onConfirm:    function(pendingMap) — called after staging, before close
     onCalJump:    function(dateStr, result) — navigate to calendar
   }
──────────────────────────────────────────────────────── */
/* ── Move Reason categories ─────────────────────────────────
   key = stored value, labelDe = display text,
   roles = who can select this reason              */
var MOVE_REASONS = [
  { key: 'schedule_conflict', labelDe: 'Terminüberschneidung', roles: ['teacher', 'student'] },
  { key: 'illness',           labelDe: 'Krankheit',            roles: ['teacher', 'student'] },
  { key: 'student_request',   labelDe: 'Auf Wunsch des Schülers', roles: ['teacher'] },
  { key: 'teacher_request',   labelDe: 'Auf Wunsch des Lehrers',  roles: ['student'] },
  { key: 'technical_issue',   labelDe: 'Technische Probleme',  roles: ['teacher', 'student'] },
  { key: 'personal_matter',   labelDe: 'Persönlicher Grund',   roles: ['teacher', 'student'] },
  { key: 'travel',            labelDe: 'Reise / Abwesenheit',  roles: ['teacher', 'student'] },
  { key: 'weather',           labelDe: 'Wetterbedingungen',    roles: ['teacher', 'student'] },
  { key: 'other',             labelDe: 'Sonstiges',            roles: ['teacher', 'student'] }
];
window.MOVE_REASONS = MOVE_REASONS;

function openMoveBlockDialogShared(opts) {
  var block     = opts.block;
  var teacherId = opts.teacherId;
  var pending   = opts.pendingMap;
  var stuId     = opts.stuId;
  /* displayName override allows callers to pass a pre-resolved name (e.g. student showing teacher name) */
  var stuName = opts.displayName
    ? opts.displayName
    : ProfileStore.getDisplayName(block.student ? block.student.uid : (opts && opts.stuId ? opts.stuId : '?'));
  var slotCount = block.bookedSlots.length;

  /* Check if block is fully confirmed */
  var isFullyConfirmed = block.bookedSlots.every(function(s) {
    var orig = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0];
    return orig && !!orig.confirmedAt;
  });

  /* ── Aktionsbereich oben: Bestätigen + Stornieren ── */
  var actionSectionHTML = '';
  if (!isFullyConfirmed) {
    actionSectionHTML =
      '<div class="move-dialog-actions">' +
        '<button class="btn btn-primary btn-sm" id="bk-block-confirm-btn">\u2713 Best\u00e4tigen</button>' +
        '<button class="btn btn-danger btn-sm" id="bk-block-cancel-btn">Stornieren</button>' +
        '<button class="btn btn-move btn-sm" id="bk-block-move-btn" aria-expanded="false">' +
          '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M4 6l4-4 4 4M4 10l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          ' Verschieben' +
        '</button>' +
      '</div>' +
      '<hr class="move-dialog-divider">';
  } else {
    actionSectionHTML =
      '<div class="move-dialog-actions">' +
        '<span class="badge badge-confirmed">\u2713 Bestätigt</span>' +
      '</div>' +
      '<hr class="move-dialog-divider">';
  }

  var bodyHTML =
    '<div class="move-dialog">' +
      '<p class="move-dialog-info"><strong>' + slotCount + ' Slot' + (slotCount !== 1 ? 's' : '') + '</strong>' +
        ' (' + block.start + ' \u2013 ' + block.end + ') \u2014 <strong>' + stuName + '</strong></p>' +

      actionSectionHTML +

      (isFullyConfirmed ? '' :
        '<div class="move-panel" id="move-panel">' +
        '<div class="move-dialog-col">' +
          '<label class="form-label">Datum</label>' +
          '<input type="date" id="move-date-input" class="form-select" value="' + block.dateStr + '" />' +
        '</div>' +
        '<div class="move-dialog-col">' +
          '<label class="form-label">Startzeit</label>' +
          '<select id="move-time-select" class="form-select"><option value="">Datum w\u00e4hlen</option></select>' +
        '</div>' +
        '<div class="move-reason-section">' +
          '<label class="form-label move-reason-label">Grund der Verschiebung <span class="move-reason-required">*</span></label>' +
          '<div class="custom-dropdown move-reason-dropdown" id="move-reason-dropdown">' +
            '<button type="button" class="custom-dropdown-trigger" id="move-reason-trigger" aria-haspopup="listbox" aria-expanded="false">' +
              '<span class="custom-dropdown-label" id="move-reason-label">Bitte Grund w\u00e4hlen\u2026</span>' +
              '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<ul class="custom-dropdown-list" id="move-reason-list" role="listbox" aria-label="Grund w\u00e4hlen"></ul>' +
          '</div>' +
          '<label class="form-label move-reason-note-label">Hinweis <span class="move-reason-optional">(optional)</span></label>' +
          '<textarea id="move-reason-note" class="form-textarea" maxlength="200" placeholder="Kurze Beschreibung\u2026" rows="2"></textarea>' +
        '</div>' +
        '<div id="move-check-result" class="move-check-result"></div>' +
        '<div class="move-dialog-btns">' +
          '<button class="btn btn-primary" id="move-check-btn">Verf\u00fcgbarkeit pr\u00fcfen</button>' +
          '<button class="btn btn-primary is-hidden" id="move-confirm-btn">Verschieben</button>' +
          '<button class="btn btn-ghost is-hidden" id="move-cal-btn">Im Kalender anzeigen</button>' +
        '</div>' +
        '</div>' +

        (!opts.hideRecurring ?
        '<div class="recur-section">' +
          '<button class="btn btn-ghost recur-toggle-btn" id="recur-toggle">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0111.46-2.46M14 8a6 6 0 01-11.46 2.46" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            ' Regelm\u00e4\u00dfig buchen' +
          '</button>' +
        '</div>' : '')
      ) +

      '<div class="move-dialog-btns">' +
        '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>' +
      '</div>' +
    '</div>';

  var result = Modal.show({ title: 'Block bearbeiten', bodyHTML: bodyHTML, footerHTML: '' });

  var cancelBtn = document.getElementById('modal-cancel');
  cancelBtn.addEventListener('click', result.close);

  /* ── Verschieben toggle — öffnet/schließt das move-panel ── */
  var movePanelToggle = document.getElementById('bk-block-move-btn');
  var movePanel       = document.getElementById('move-panel');
  if (movePanelToggle && movePanel) {
    movePanelToggle.addEventListener('click', function() {
      var isOpen = movePanel.classList.contains('is-open');
      if (isOpen) {
        movePanel.classList.remove('is-open');
        movePanelToggle.classList.remove('is-active');
        movePanelToggle.setAttribute('aria-expanded', 'false');
      } else {
        movePanel.classList.add('is-open');
        movePanelToggle.classList.add('is-active');
        movePanelToggle.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ── Bestätigen ── */
  var confirmBlockBtn = document.getElementById('bk-block-confirm-btn');
  if (confirmBlockBtn) {
    confirmBlockBtn.addEventListener('click', function() {
      result.close();
      /* Warn-Dialog vor Bestätigung */
      var warnHTML =
        '<div class="move-dialog">' +
          '<p class="confirm-dialog-warning">\u26a0 <strong>Achtung:</strong> Diese Aktion kann nicht r\u00fckcg\u00e4ngig gemacht werden.</p>' +
          '<p class="move-dialog-info">Mit der Best\u00e4tigung der Stunde von <strong>' + stuName + '</strong> (' + block.start + ' \u2013 ' + block.end + '):</p>' +
          '<ul class="confirm-dialog-list">' +
            '<li>kann die Stunde <strong>nicht mehr verschoben</strong> werden</li>' +
            '<li>kann die Stunde <strong>nicht mehr storniert</strong> werden</li>' +
            '<li>wird die <strong>Zahlung f\u00fcr die Stunde freigegeben</strong></li>' +
          '</ul>' +
        '</div>';
      var warn = Modal.show({
        title: 'Stunde best\u00e4tigen',
        bodyHTML: warnHTML,
        footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Abbrechen</button><button class="btn btn-primary" id="modal-confirm">Jetzt best\u00e4tigen</button>'
      });
      document.getElementById('modal-cancel').addEventListener('click', warn.close);
      document.getElementById('modal-confirm').addEventListener('click', function() {
        warn.close();
        if (!block.bookedSlots || !block.bookedSlots.length) {
          if (opts.onConfirmBlock) opts.onConfirmBlock();
          return;
        }
        AppService.confirmBlock(block.bookedSlots, function(e) {
          if (e) Toast.error(e.message || e);
          if (opts.onConfirmBlock) opts.onConfirmBlock();
        });
      });
    });
  }

  /* ── Stornieren ── */
  var cancelBlockBtn = document.getElementById('bk-block-cancel-btn');
  if (cancelBlockBtn) {
    cancelBlockBtn.addEventListener('click', function() {
      result.close();
      var actorRole   = opts.actorRole || 'student';
      var pendingMap  = opts.pendingMap || {};
      var slots       = block.bookedSlots || [];
      var displayName = opts.displayName || stuName;
      var endTime     = block.end || AppService.slotEndTime(block.start);

      /* Show aggregate policy dialog for ALL slots in the block */
      var firstSlot = slots[0];
      if (!firstSlot) {
        if (opts.onCancelBlock) opts.onCancelBlock();
        return;
      }

      _showCancelBlockPolicyDialog(slots, pendingMap, function() {
        if (opts.onCancelBlock) opts.onCancelBlock();
      }, displayName, block.start, endTime, block.dateStr, actorRole);
    });
  }

  if (isFullyConfirmed) return; /* Confirmed blocks: no move/recurring logic needed */

  var dateInput   = document.getElementById('move-date-input');
  var timeSelect  = document.getElementById('move-time-select');
  var checkResult  = document.getElementById('move-check-result');
  var checkBtn     = document.getElementById('move-check-btn');
  var confirmBtn   = document.getElementById('move-confirm-btn');
  var calBtn       = document.getElementById('move-cal-btn');
  var reasonNote   = document.getElementById('move-reason-note');

  /* ── Custom dropdown for reason ────────────────────────── */
  var _selectedReason      = '';
  var _selectedReasonLabel = '';
  var reasonTrigger = document.getElementById('move-reason-trigger');
  var reasonList    = document.getElementById('move-reason-list');
  var reasonLabelEl = document.getElementById('move-reason-label');

  function _closeReasonDropdown() {
    if (!reasonList) return;
    reasonList.classList.remove('is-open');
    if (reasonTrigger) { reasonTrigger.setAttribute('aria-expanded', 'false'); reasonTrigger.classList.remove('is-open'); }
  }
  function _openReasonDropdown() {
    if (!reasonList) return;
    reasonList.classList.add('is-open');
    if (reasonTrigger) { reasonTrigger.setAttribute('aria-expanded', 'true'); reasonTrigger.classList.add('is-open'); }
  }

  if (reasonTrigger && reasonList && typeof MOVE_REASONS !== 'undefined') {
    var actorRoleForReasons = opts.actorRole || 'student';
    for (var ri = 0; ri < MOVE_REASONS.length; ri++) {
      var mr = MOVE_REASONS[ri];
      if (mr.roles.indexOf(actorRoleForReasons) === -1) continue;
      var li = document.createElement('li');
      li.className = 'custom-dropdown-item';
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', mr.key);
      li.textContent = mr.labelDe;
      (function(key, label) {
        li.addEventListener('click', function() {
          _selectedReason      = key;
          _selectedReasonLabel = label;
          if (reasonLabelEl) reasonLabelEl.textContent = label;
          var items = reasonList.querySelectorAll('.custom-dropdown-item');
          for (var ii = 0; ii < items.length; ii++) {
            items[ii].classList.toggle('is-active', items[ii].getAttribute('data-value') === key);
          }
          _closeReasonDropdown();
          if (reasonTrigger) reasonTrigger.classList.remove('input-error');
        });
      }(mr.key, mr.labelDe));
      reasonList.appendChild(li);
    }
    reasonTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (reasonList.classList.contains('is-open')) _closeReasonDropdown();
      else _openReasonDropdown();
    });
    document.addEventListener('click', function _rdClose(e) {
      if (!e.target.closest('#move-reason-dropdown')) {
        _closeReasonDropdown();
        document.removeEventListener('click', _rdClose);
      }
    });
  }

  function resetCheck() {
    checkResult.textContent = '';
    checkResult.className = 'move-check-result';
    confirmBtn.classList.add('is-hidden');
    checkBtn.classList.remove('is-hidden');
    var hasInputs = dateInput.value && timeSelect.value;
    calBtn.classList.toggle('is-hidden', !hasInputs);
  }

  function isFreeSlot(s) {
    if (s.status === 'available' || s.status === 'recurring') return true;
    if (pending[s.slotId] && pending[s.slotId].action === 'cancel') return true;
    return false;
  }

  function rebuildTimes() {
    timeSelect.innerHTML = '';
    var dateStr = dateInput.value;
    if (!dateStr) { calBtn.classList.add('is-hidden'); return; }
    var allDay = AppService.getSlotsByTeacherDateSync(teacherId, dateStr)
      .sort(function(a, b) { return a.time.localeCompare(b.time); });
    var free = allDay.filter(isFreeSlot);
    if (!free.length) {
      var o = document.createElement('option');
      o.value = ''; o.textContent = 'Keine freien Slots';
      timeSelect.appendChild(o);
      return;
    }
    for (var i = 0; i < free.length; i++) {
      var o = document.createElement('option');
      o.value = free[i].slotId;
      o.textContent = free[i].time + ' – ' + AppService.slotEndTime(free[i].time);
      timeSelect.appendChild(o);
    }
    resetCheck();
  }

  rebuildTimes();
  dateInput.addEventListener('change', function() { rebuildTimes(); resetCheck(); });
  timeSelect.addEventListener('change', function() {
    resetCheck();
    var hasInputs = dateInput.value && timeSelect.value;
    calBtn.classList.toggle('is-hidden', !hasInputs);
  });

  checkBtn.addEventListener('click', function() {
    var startSlotId = timeSelect.value;
    if (!startSlotId) {
      checkResult.textContent = 'Bitte Datum und Startzeit wählen.';
      checkResult.className = 'move-check-result move-check-fail';
      return;
    }
    var dateStr = dateInput.value;
    var allDay  = AppService.getSlotsByTeacherDateSync(teacherId, dateStr)
      .sort(function(a, b) { return a.time.localeCompare(b.time); });
    var startIdx = -1;
    for (var i = 0; i < allDay.length; i++) {
      if (allDay[i].slotId === startSlotId) { startIdx = i; break; }
    }
    if (startIdx === -1 || startIdx + slotCount > allDay.length) {
      checkResult.textContent = 'Nicht genug Slots ab dieser Zeit (' + slotCount + ' benötigt).';
      checkResult.className = 'move-check-result move-check-fail';
      return;
    }
    var targetSlots = allDay.slice(startIdx, startIdx + slotCount);
    var blocked = [];
    for (var j = 0; j < targetSlots.length; j++) {
      if (!isFreeSlot(targetSlots[j])) blocked.push(targetSlots[j].time);
    }
    if (blocked.length) {
      checkResult.textContent = 'Nicht alle Slots frei. Belegt: ' + blocked.join(', ') + '.';
      checkResult.className = 'move-check-result move-check-fail';
      confirmBtn.classList.add('is-hidden');
      checkBtn.classList.remove('is-hidden');
    } else {
      checkResult.textContent = '\u2713 Alle ' + slotCount + ' Slots frei \u2014 Verschiebung möglich.';
      checkResult.className = 'move-check-result move-check-ok';
      confirmBtn.classList.remove('is-hidden');
      calBtn.classList.remove('is-hidden');
      checkBtn.classList.add('is-hidden');
    }
  });

  confirmBtn.addEventListener('click', function() {
    _confirmed = true;
    var startSlotId = timeSelect.value;
    if (!startSlotId) return;

    /* Validate reason (required) */
    var selectedReason = _selectedReason;
    if (!selectedReason) {
      if (reasonTrigger) {
        reasonTrigger.classList.add('input-error');
        reasonTrigger.focus();
      }
      checkResult.textContent = 'Bitte einen Grund für die Verschiebung wählen.';
      checkResult.className = 'move-check-result move-check-fail';
      return;
    }
    if (reasonTrigger) reasonTrigger.classList.remove('input-error');

    var selectedReasonLabel = _selectedReasonLabel;
    var selectedNote = (reasonNote && reasonNote.value) ? reasonNote.value.trim() : '';

    var dateStr = dateInput.value;
    var allDay  = AppService.getSlotsByTeacherDateSync(teacherId, dateStr)
      .sort(function(a, b) { return a.time.localeCompare(b.time); });
    var startIdx = -1;
    for (var i = 0; i < allDay.length; i++) {
      if (allDay[i].slotId === startSlotId) { startIdx = i; break; }
    }
    if (startIdx === -1) return;
    var targetSlots = allDay.slice(startIdx, startIdx + slotCount);
    for (var k = 0; k < block.bookedSlots.length; k++) {
      var orig = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === block.bookedSlots[k].slotId; })[0];
      if (orig) pending[orig.slotId] = { action: 'cancel', originalSlot: orig, newStudentId: null };
    }
    for (var m = 0; m < targetSlots.length; m++) {
      var tgt = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === targetSlots[m].slotId; })[0];
      if (tgt) pending[tgt.slotId] = {
        action: 'book', originalSlot: tgt, newStudentId: stuId, extraStudents: [],
        moveReason: selectedReason, moveReasonLabel: selectedReasonLabel, moveNote: selectedNote
      };
    }

    /* Store move opts for callers (student.js / teacher.js) to pass to writeMoveRecord */
    opts._lastMoveOpts = {
      reason:      selectedReason,
      reasonLabel: selectedReasonLabel,
      note:        selectedNote
    };

    opts.onConfirm(pending, opts);
    result.close();
    /* Toast handled by caller (teacher: auto-saved; student: shows save button) */
  });

  calBtn.addEventListener('click', function() {
    opts.onCalJump(dateInput.value, result);
  });

  cancelBtn.addEventListener('click', result.close);

  /* ── Recurring booking: delegate to shared _openRecurringBookingDialog ── */
  var recurToggle = document.getElementById('recur-toggle');
  var recurPanel  = document.getElementById('recur-panel');

  recurToggle.addEventListener('click', function() {
    /* Build bundle from all slots in this block */
    var sourceDate = new Date(block.dateStr + 'T00:00:00');
    var startTime  = block.startUtc;   /* UTC key — must match slot.time (stored as UTC) */
    var allDay = AppService.getSlotsByTeacherDateSync(teacherId, block.dateStr)
      .sort(function(a, b) { return a.time.localeCompare(b.time); });
    var startIdx = -1;
    for (var i = 0; i < allDay.length; i++) {
      if (allDay[i].time === startTime) { startIdx = i; break; }
    }
    var bundleSlots = startIdx >= 0
      ? allDay.slice(startIdx, startIdx + slotCount)
      : [];
    var anchorSlot = bundleSlots[0] || null;
    if (!anchorSlot) {
      Toast.info('Kein Slot als Ausgangspunkt gefunden.');
      return;
    }
    _openRecurringBookingDialog({
      slot:             anchorSlot,
      bundleSlots:      bundleSlots,
      teacherId:        teacherId,
      stuId:            stuId,
      isTeacherBooking: !!(opts && opts.isTeacherBooking),
      pendingMap:       pending,
      onConfirm:        function(pm) {
        opts.onConfirm(pm);
        result.close();
      }
    });
  });
}


/**
 * _openRecurringBookingDialog
 * Standalone-Dialog: regelmäßig buchen für einen einzelnen freien Slot.
 *
 * opts:
 *   slot        — der Ausgangs-Slot (date, time, slotId, teacherId)
 *   teacherId   — Lehrer-UID
 *   stuId       — Schüler-UID
 *   pendingMap  — pendingDayChanges (wird direkt mutiert)
 *   onConfirm   — function(pendingMap) — nach Buchungsbestätigung
 */
function _openRecurringBookingDialog(opts) {
  var slot        = opts.slot;
  var teacherId   = opts.teacherId;
  var stuId       = opts.stuId;
  /* Multi-student support: stuIds[] takes priority over stuId */
  var stuIds      = opts.stuIds && opts.stuIds.length ? opts.stuIds : [stuId];
  var pending     = opts.pendingMap;
  var onConfirm   = opts.onConfirm;
  /* bundleSlots: array of slot objects for the full weekly block.
     If not provided, falls back to single slot. */
  var bundleSlots = opts.bundleSlots && opts.bundleSlots.length
    ? opts.bundleSlots.slice().sort(function(a,b){return a.time.localeCompare(b.time);})
    : [slot];
  var bundleTimes = bundleSlots.map(function(s){return s.time;});

  var teacherName = (typeof ProfileStore !== 'undefined')
    ? ProfileStore.getDisplayName(teacherId) : teacherId;

  var sourceDate = new Date(slot.date + 'T00:00:00');
  /* Bundle label: first slot start → last slot end */
  var bundleStart = bundleTimes[0];
  var bundleEnd   = (typeof AppService !== 'undefined')
    ? AppService.slotEndTime(bundleTimes[bundleTimes.length - 1])
    : bundleTimes[bundleTimes.length - 1];
  var bundleLabel = bundleStart + '–' + bundleEnd;
  var slotCountLabel = bundleSlots.length > 1
    ? ' (' + bundleSlots.length + '× Slots)' : '';

  /* Wochentag-Label */
  var weekdayLabel = sourceDate.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  /* ── Price helper — student-specific price has priority ── */
  function _pricePerSlot() {
    if (typeof AppService === 'undefined') return 0;
    var sid = stuIds && stuIds.length ? stuIds[0] : null;
    if (sid && typeof AppService.getStudentPriceForTeacherSync === 'function') {
      return AppService.getStudentPriceForTeacherSync(sid, teacherId) || 0;
    }
    return AppService.getTeacherPriceSync(teacherId) || 0;
  }

  /* ── HTML ── */
  var bodyHTML =
    '<div class="move-dialog recur-standalone">' +
      '<p class="move-dialog-info">' +
        '<strong>' + teacherName + '</strong> &nbsp;&bull;&nbsp; ' +
        bundleLabel + slotCountLabel +
      '</p>' +
      '<p class="recur-source-date">' + weekdayLabel + '</p>' +

      /* Mode toggle */
      '<div class="recur-mode-row">' +
        '<button class="recur-mode-btn is-active" id="recur-mode-weeks" data-mode="weeks">Anzahl Wochen</button>' +
        '<button class="recur-mode-btn" id="recur-mode-range" data-mode="range">Von–Bis Datum</button>' +
      '</div>' +

      /* Weeks mode */
      '<div id="recur-input-weeks" class="recur-input-block">' +
        '<div class="move-dialog-row">' +
          '<div class="move-dialog-col">' +
            '<label class="form-label">Anzahl Wochen im Voraus</label>' +
            '<input type="number" id="recur-weeks-input" class="form-select" min="1" max="52" value="4" />' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* Date range mode */
      '<div id="recur-input-range" class="recur-input-block is-hidden">' +
        '<div class="move-dialog-row">' +
          '<div class="move-dialog-col">' +
            '<label class="form-label">Von</label>' +
            '<input type="date" id="recur-from-input" class="form-select" />' +
          '</div>' +
          '<div class="move-dialog-col">' +
            '<label class="form-label">Bis</label>' +
            '<input type="date" id="recur-to-input" class="form-select" />' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="recur-result" id="recur-result"></div>' +

      '<div class="move-dialog-btns">' +
        '<button class="btn btn-primary" id="recur-check-btn">Verfügbarkeit prüfen</button>' +
        '<button class="btn btn-primary is-hidden" id="recur-confirm-btn">Verfügbare Tage buchen</button>' +
      '</div>' +
    '</div>';

  var result = Modal.show({
    title: 'Regelmäßig buchen',
    bodyHTML: bodyHTML,
    footerHTML: '<button class="btn btn-ghost" id="recur-cancel-btn">Abbrechen</button>'
  });

  var cancelBtn   = document.getElementById('recur-cancel-btn');
  var checkBtn    = document.getElementById('recur-check-btn');
  var confirmBtn  = document.getElementById('recur-confirm-btn');
  var resultEl    = document.getElementById('recur-result');
  var weeksInput  = document.getElementById('recur-weeks-input');
  var fromInput   = document.getElementById('recur-from-input');
  var toInput     = document.getElementById('recur-to-input');
  var inputWeeks  = document.getElementById('recur-input-weeks');
  var inputRange  = document.getElementById('recur-input-range');
  var recurData   = null;

  /* Set default date range: next day → +8 weeks */
  var defFrom = new Date(sourceDate); defFrom.setDate(defFrom.getDate() + 7);
  var defTo   = new Date(sourceDate); defTo.setDate(defTo.getDate() + 8 * 7);
  fromInput.value = _fmtDateLocal(defFrom);
  toInput.value   = _fmtDateLocal(defTo);

  /* Track whether user confirmed — any other close path = cancel */
  var _confirmed = false;
  var _origClose = result.close;
  result.close = function() {
    _origClose();
    if (!_confirmed && typeof opts.onCancel === 'function') {
      opts.onCancel();
    }
  };

  cancelBtn.addEventListener('click', result.close);

  /* Mode toggle */
  var modeBtns = document.querySelectorAll('.recur-mode-btn');
  var activeMode = 'weeks';
  for (var mb = 0; mb < modeBtns.length; mb++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        activeMode = btn.getAttribute('data-mode');
        for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('is-active');
        btn.classList.add('is-active');
        inputWeeks.classList.toggle('is-hidden', activeMode !== 'weeks');
        inputRange.classList.toggle('is-hidden', activeMode !== 'range');
        /* reset results */
        resultEl.innerHTML = '';
        confirmBtn.classList.add('is-hidden');
        checkBtn.classList.remove('is-hidden');
        recurData = null;
      });
    })(modeBtns[mb]);
  }

  /* ── Date helpers ── */
  function _fmtDateLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  function _formatFull(dateObj) {
    return dateObj.toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  function _getWeekDates(dateObj) {
    var d = new Date(dateObj);
    var dow = d.getDay();
    var monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var day = new Date(monday);
      day.setDate(monday.getDate() + i);
      dates.push(day);
    }
    return dates;
  }

  function _isFreeSlot(s) {
    if (s.status === 'available' || s.status === 'recurring') return true;
    if (pending[s.slotId] && pending[s.slotId].action === 'cancel') return true;
    return false;
  }

  /* ── Build target dates from input ── */
  function _buildTargetDates() {
    var targets = [];
    if (activeMode === 'weeks') {
      var weeks = parseInt(weeksInput.value, 10);
      if (!weeks || weeks < 1) return null;
      for (var w = 1; w <= weeks; w++) {
        var d = new Date(sourceDate);
        d.setDate(sourceDate.getDate() + w * 7);
        targets.push(d);
      }
    } else {
      var from = fromInput.value ? new Date(fromInput.value + 'T00:00:00') : null;
      var to   = toInput.value   ? new Date(toInput.value   + 'T00:00:00') : null;
      if (!from || !to || from > to) return null;
      var srcDow = (sourceDate.getDay() + 6) % 7; /* Mon=0 */
      var cur = new Date(from);
      while (cur <= to) {
        var curDow = (cur.getDay() + 6) % 7;
        if (curDow === srcDow) {
          targets.push(new Date(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return targets;
  }

  /* ── Check availability ── */
  checkBtn.addEventListener('click', function() {
    resultEl.innerHTML = '';
    confirmBtn.classList.add('is-hidden');
    checkBtn.classList.remove('is-hidden');
    recurData = null;

    try {

    var targets = _buildTargetDates();
    if (!targets) {
      resultEl.innerHTML = '<p class="move-check-fail">Bitte gültige Eingabe machen.</p>';
      return;
    }
    if (!targets.length) {
      resultEl.innerHTML = '<p class="move-check-fail">Keine passenden Wochentage im gewählten Zeitraum.</p>';
      return;
    }

    var pricePerSlot  = _pricePerSlot();
    var pricePerBundle = pricePerSlot * bundleSlots.length;
    recurData = [];

    for (var i = 0; i < targets.length; i++) {
      var targetDate    = targets[i];
      var targetDateStr = _fmtDateLocal(targetDate);

      var weekDates = _getWeekDates(targetDate);
      if (typeof AppService !== 'undefined') {
        AppService.materialiseWeek(teacherId, weekDates, function() {});
        /* Teacher-side: if a bundle slot doesn't exist on target date, create it.
           The teacher controls their own schedule — booking recurring implies creating the slots. */
        if (opts && opts.isTeacherBooking) {
          var existingTimes = AppService.getSlotsByTeacherDateSync(teacherId, targetDateStr)
            .map(function(s) { return s.time; });
          for (var ci = 0; ci < bundleTimes.length; ci++) {
            if (existingTimes.indexOf(bundleTimes[ci]) === -1) {
              AppService.createSlot({
                teacherId:  teacherId,
                studentId:  null,
                date:       targetDateStr,
                time:       bundleTimes[ci],
                status:     'available',
                baseStatus: 'available'
              }, function() {});
            }
          }
        }
      }

      var allDay = (typeof AppService !== 'undefined')
        ? AppService.getSlotsByTeacherDateSync(teacherId, targetDateStr)
            .sort(function(a, b) { return a.time.localeCompare(b.time); })
        : [];

      /* Check ALL bundle times — week only available if every slot is free */
      var bundleSlotsFound = [];
      var allFree = true;
      var failReason = '';
      for (var bi = 0; bi < bundleTimes.length; bi++) {
        var bTime = bundleTimes[bi];
        var found = null;
        for (var j = 0; j < allDay.length; j++) {
          if (allDay[j].time === bTime) { found = allDay[j]; break; }
        }
        if (!found) {
          allFree = false; failReason = bTime + ' nicht vorhanden'; break;
        } else if (!_isFreeSlot(found)) {
          var rs = found.status === 'timeout' ? 'Abgelaufen'
            : found.status === 'booked' ? 'Bereits gebucht' : found.status;
          allFree = false; failReason = bTime + ': ' + rs; break;
        }
        bundleSlotsFound.push(found);
      }

      recurData.push({
        date: targetDate, dateStr: targetDateStr,
        available: allFree, reason: failReason,
        slots: bundleSlotsFound,
        slot: bundleSlotsFound[0] || null   /* legacy compat */
      });
    }

    var availWeeks = recurData.filter(function(e) { return e.available; });

    /* ── Deposit info + per-student funds cutoff ── */
    AppService.calcDepositInfo(teacherId, pricePerSlot, function(errDep, dep) {
      var fmt = (typeof _fmtForUser === 'function')
        ? function(a) { return _fmtForUser(a, stuIds[0]); }
        : function(a) { return '\u20ac' + parseFloat(a).toFixed(2).replace('.', ','); };

      var payMode      = (!errDep && dep) ? (dep.paymentMode || 'instant') : 'instant';
      var reqDep       = (!errDep && dep) ? (dep.requiresDeposit !== false) : false;
      var depAmt       = (!errDep && dep) ? (dep.depositAmount || 0) : 0;
      var depPerBundle = Math.round(depAmt * bundleSlots.length * 100) / 100;
      var costPerBundle = (payMode === 'cash_on_site' || pricePerBundle === 0)
        ? 0 : (reqDep ? depPerBundle : pricePerBundle);

      /* Per-student bookable weeks */
      var stuResults = stuIds.map(function(uid) {
        var wallet  = AppService.getWalletSync ? AppService.getWalletSync(uid) : null;
        var balance = wallet ? (parseFloat(wallet.balance) || 0) : 0;
        var bkable  = [];
        if (costPerBundle === 0) {
          bkable = availWeeks;
        } else {
          var rem = balance;
          for (var bk = 0; bk < availWeeks.length; bk++) {
            if (rem >= costPerBundle) {
              bkable.push(availWeeks[bk]);
              rem = Math.round((rem - costPerBundle) * 100) / 100;
            } else { break; }
          }
        }
        return { uid: uid, balance: balance, bookable: bkable };
      });

      /* Overall bookable = union of all students' weeks (teacher slot must be free) */
      var bookable = availWeeks; /* slot availability already checked above */
      var totalStuSlots = 0;
      stuResults.forEach(function(sr) { totalStuSlots += sr.bookable.length; });
      var anyBookable = stuResults.some(function(sr) { return sr.bookable.length > 0; });

      /* ── Build per-student accordion HTML ── */
      var html = '';
      /* summary line above accordions */
      if (stuIds.length > 1) {
        var allOk = stuResults.every(function(sr){ return sr.bookable.length === recurData.length; });
        html += '<div class="recur-summary ' + (!anyBookable ? 'recur-summary-line--bad' : (!allOk ? 'recur-summary-line--warn' : 'recur-summary-line')) + '">' +
          (!anyBookable ? '\u2717 Keine Buchung m\u00f6glich' :
            '\u21bb ' + stuIds.length + ' Sch\u00fcler \u00b7 ' + totalStuSlots + ' Slots gesamt') +
          '</div>';
      }

      html += '<div class="recur-stu-list">';
      for (var si = 0; si < stuResults.length; si++) {
        var sr       = stuResults[si];
        var stuName2 = (typeof ProfileStore !== 'undefined') ? ProfileStore.getDisplayName(sr.uid) : sr.uid;
        var stuOk    = sr.bookable.length === recurData.length;
        var stuNone  = sr.bookable.length === 0;
        var stuPart  = !stuOk && !stuNone;
        var hdrColor = stuNone ? '#dc2626' : (stuPart ? '#f59e0b' : '#16a34a');
        var cntTx    = stuNone ? 'var(--danger-strong-tx)' : (stuPart ? '#7a5c00' : 'var(--status-save-ok-tx)');
        var cntIcon  = stuNone ? '\u2717' : (stuPart ? '\u26a0' : '\u2713');

        html += '<div class="recur-stu-card">' +
          '<div class="recur-stu-header" data-stu-idx="' + si + '" style="border-left:3px solid ' + hdrColor + '">' +
            '<span class="recur-stu-name">' + _esc(stuName2) + '</span>' +
            '<span class="recur-stu-count" style="color:' + cntTx + '">' +
              cntIcon + ' ' + sr.bookable.length + '/' + recurData.length +
            '</span>' +
          '</div>' +
          '<div class="recur-stu-body" id="recur-stu-body-' + si + '">' +
            '<table class="recur-table">' +
            '<thead><tr>' +
              '<th class="recur-th">Datum</th>' +
              '<th class="recur-th">Block</th>' +
              (pricePerBundle > 0 && payMode !== 'cash_on_site' ? '<th class="recur-th recur-th--right">' + (reqDep ? 'Dep.' : 'Preis') + '</th>' : '') +
              '<th class="recur-th recur-th--center"></th>' +
            '</tr></thead><tbody>';

        for (var ri = 0; ri < recurData.length; ri++) {
          var e       = recurData[ri];
          var isBook2 = sr.bookable.indexOf(e) !== -1;
          var rowBg2  = ri % 2 === 0 ? 'var(--neutral-0)' : 'var(--neutral-50)';
          var icon2   = isBook2 ? '\u2713' : (e.available ? '\u26a0' : '\u2717');
          var ic2     = isBook2 ? 'var(--status-save-ok-tx)' : (e.available ? '#f59e0b' : 'var(--danger-strong-tx)');
          var note2   = !e.available ? (e.reason || 'n. verf.') : (!isBook2 ? 'kein Guth.' : '');
          var depCell2 = isBook2
            ? (reqDep ? fmt(depPerBundle) : fmt(pricePerBundle))
            : '<span class="recur-td--note">' + note2 + '</span>';
          var sd2 = e.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
          html += '<tr class="recur-td ' + (ri % 2 === 0 ? 'recur-row--even' : 'recur-row--odd') + '">' +
            '<td class="recur-td">' + sd2 + '</td>' +
            '<td class="recur-td recur-td--mono">' + bundleLabel + '</td>' +
            (pricePerBundle > 0 && payMode !== 'cash_on_site' ? '<td class="recur-td recur-td--right">' + depCell2 + '</td>' : '') +
            '<td class="recur-td recur-td--center ' + (isBook2 ? 'recur-td--icon-ok' : (e.available ? 'recur-td--icon-warn' : 'recur-td--icon-bad')) + '">' + icon2 + '</td>' +
          '</tr>';
        }
        html += '</tbody></table>';
        /* Wallet row */
        if (pricePerBundle > 0 && payMode !== 'cash_on_site') {
          var wCls2 = stuNone ? 'recur-wallet-warn' : 'recur-wallet-ok';
          var wTxt2 = (stuNone ? '\u2717 ' : '\u2713 ') + 'Guthaben: ' + fmt(sr.balance);
          if (reqDep && sr.bookable.length > 0) wTxt2 += ' \u00b7 Dep.: ' + fmt(Math.round(depPerBundle * sr.bookable.length * 100)/100);
          html += '<div class="recur-wallet-row ' + wCls2 + '" style="margin:4px 6px 6px;border-radius:4px;padding:4px 6px">' + wTxt2 + '</div>';
        }
        html += '</div></div>'; /* close stu-body + stu-card */
      }
      html += '</div>'; /* close recur-stu-list */

      resultEl.innerHTML = html;

      /* Wire accordion toggles */
      var stuHeaders = resultEl.querySelectorAll('.recur-stu-header');
      for (var shi = 0; shi < stuHeaders.length; shi++) {
        (function(hdr) {
          var idx3  = hdr.getAttribute('data-stu-idx');
          var body3 = document.getElementById('recur-stu-body-' + idx3);
          if (body3) hdr.style.cursor = 'pointer';
          hdr.addEventListener('click', function() {
            if (body3) body3.classList.toggle('is-hidden');
          });
        })(stuHeaders[shi]);
      }

      /* Confirm button */
      if (anyBookable) {
        confirmBtn.classList.remove('is-hidden');
        var totalSlots3 = 0;
        stuResults.forEach(function(sr4){ totalSlots3 += sr4.bookable.length * bundleSlots.length; });
        var btnLabel3 = stuIds.length > 1
          ? '↻ Buchen: ' + stuIds.length + ' Schüler · ' + totalSlots3 + ' Slots'
          : '↻ Buchen: ' + stuResults[0].bookable.length + ' Woche' + (stuResults[0].bookable.length !== 1 ? 'n' : '') +
            (bundleSlots.length > 1 ? ' (' + (stuResults[0].bookable.length * bundleSlots.length) + ' Slots)' : '');
        confirmBtn.textContent = btnLabel3;
        confirmBtn._stuResults = stuResults;
        checkBtn.classList.add('is-hidden');
      } else {
        confirmBtn.classList.add('is-hidden');
        checkBtn.classList.remove('is-hidden');
      }
    });

    } catch(checkErr) {
      resultEl.innerHTML = '<p class="move-check-fail">⚠ Fehler: ' + (checkErr.message || checkErr) + '</p>';
    }
  });

  /* ── Confirm: stage slots per student, respecting per-student bookable weeks ── */
  confirmBtn.addEventListener('click', function() {
    _confirmed = true;  /* prevent onCancel from firing on close */
    var sr2 = confirmBtn._stuResults;
    if (!sr2 || !sr2.length) return;
    var booked = 0;

    /* For each week: primary student takes original slot, extras listed in extraStudents */
    /* Collect per-week which students can book */
    var allWeeks = recurData;
    for (var wi2 = 0; wi2 < allWeeks.length; wi2++) {
      var week4 = allWeeks[wi2];
      if (!week4.available || !week4.slots || !week4.slots.length) continue;
      /* Which students can book this week? */
      var weekStudents = sr2.filter(function(sr3){ return sr3.bookable.indexOf(week4) !== -1; });
      if (!weekStudents.length) continue;
      /* Primary student takes original slot */
      var primaryUid = weekStudents[0].uid;
      var extraUids  = weekStudents.slice(1).map(function(s){ return s.uid; });
      for (var ss2 = 0; ss2 < week4.slots.length; ss2++) {
        var rawSlot2 = week4.slots[ss2];
        var tgt2 = AppService.getAllSlotsSync().filter(function(x){ return x.slotId === rawSlot2.slotId; })[0];
        if (!tgt2) continue;
        pending[tgt2.slotId] = {
          action: 'book', originalSlot: tgt2,
          newStudentId:  primaryUid,
          extraStudents: extraUids
        };
        booked++;
      }
    }
    onConfirm(pending);
    result.close();
    Toast.info(booked + ' Woche' + (booked !== 1 ? 'n' : '') + ' vorgemerkt — Drück Save zum Bestätigen.');
  });
}
window._openRecurringBookingDialog = _openRecurringBookingDialog;

window.openMoveBlockDialogShared = openMoveBlockDialogShared;

window.Toast = Toast;
window.Modal = Modal;
window.Icons = Icons;

/* ═══════════════════════════════════════════════════════════════
   SHARED UTILITIES — used by both teacher.js and student.js
   Exported as window globals so both can access
═══════════════════════════════════════════════════════════════ */

function fmtDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
window.fmtDate = fmtDate;

/* ── Shared Avatar Helper ────────────────────────────────────────────
 * buildAvatarHTML(uid, opts)
 *   uid   — user uid; ProfileStore.getPhoto / getDisplayName used
 *   opts  — { size: 'sm'|'md'|'lg', role: 'teacher'|'student'|'admin' }
 * Returns an HTML string: <img> if photo exists, else <div> with initials.
 * CSS classes: avatar-img | avatar-initials  +  avatar-sm | avatar-md | avatar-lg
 * ------------------------------------------------------------------ */
function buildAvatarHTML(uid, opts) {
  opts = opts || {};
  var sizeClass = 'avatar-' + (opts.size || 'md');
  var photo     = (typeof ProfileStore !== 'undefined') ? ProfileStore.getPhoto(uid) : null;
  var name      = (typeof ProfileStore !== 'undefined') ? ProfileStore.getDisplayName(uid) : (uid || '?');
  var initials  = (function(n) {
    if (!n) return '?';
    var parts = n.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  })(name);
  var esc = function(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

  if (photo) {
    return '<img class="avatar-img ' + sizeClass + '" src="' + esc(photo) + '" alt="' + esc(name) + '">';
  }
  var roleClass = opts.role ? ' avatar-role-' + opts.role : '';
  return '<div class="avatar-initials ' + sizeClass + roleClass + '" aria-hidden="true">' + esc(initials) + '</div>';
}
window.buildAvatarHTML = buildAvatarHTML;

/* ── showProfileSheet(uid) ───────────────────────────────────────────
 * Opens a bottom-sheet with the public profile of any user (student or teacher).
 * Reuses pv-* CSS classes from profile.css (must be loaded on the page).
 * ------------------------------------------------------------------ */
function showProfileSheet(uid) {
  if (!uid || typeof ProfileStore === 'undefined') return;

  var existing = document.getElementById('profile-sheet-overlay');
  if (existing) existing.remove();

  var p    = ProfileStore.getOrDefault(uid);
  var user = (typeof AppService !== 'undefined') ? AppService.getUserSync(uid) : null;
  var esc  = function(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

  /* Avatar — always use the shared helper, no pv-hero-photo class */
  var avatarHTML = buildAvatarHTML(uid, { size: 'lg', role: user ? user.role : 'student' });

  /* Location */
  var locationHTML = p.location
    ? '<span class="profile-sheet-location"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 015-5z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg>' + esc(p.location) + '</span>'
    : '';

  /* Languages */
  var langMap = { de:'DE', en:'EN', fr:'FR', it:'IT', es:'ES', ru:'RU', ja:'JA', zh:'ZH' };
  var langsHTML = '';
  if (p.languages && p.languages.length) {
    for (var i = 0; i < p.languages.length; i++) {
      langsHTML += '<span class="pv-lang-badge">' + esc(langMap[p.languages[i]] || p.languages[i].toUpperCase()) + '</span>';
    }
    langsHTML = '<div class="pv-lang-row profile-sheet-langs">' + langsHTML + '</div>';
  }

  /* Stats */
  var skillLevelMap = { beginner:'Anfänger', intermediate:'Mittelstufe', advanced:'Fortgeschritten', expert:'Experte' };
  var statsHTML = '';
  if (p.skillLevel)      statsHTML += '<span class="profile-sheet-stat profile-sheet-skill">' + esc(skillLevelMap[p.skillLevel] || p.skillLevel) + '</span>';
  if (p.experienceYears) statsHTML += '<span class="profile-sheet-stat">' + esc(p.experienceYears) + ' Jahre Erfahrung</span>';
  if (p.pricePerHalfHour) {
    var _psPrice;
    /* Use individual price if viewer is a student with a priceOverride for this teacher */
    var _psActorUid = (typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().uid : null;
    var _psActorRole = (typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().role : null;
    var _psEffectiveRaw = (_psActorUid && _psActorRole === 'student' &&
                           typeof AppService !== 'undefined' &&
                           typeof AppService.getStudentPriceForTeacherSync === 'function')
      ? AppService.getStudentPriceForTeacherSync(_psActorUid, uid)
      : parseFloat(p.pricePerHalfHour);
    if (typeof CurrencyService !== 'undefined') {
      var _psTCur = p.priceCurrency || 'EUR';
      var _psVCur = CurrencyService.getUserCurrency(_psActorUid);
      if (_psVCur && _psVCur !== _psTCur) {
        var _psConv = CurrencyService.convertSync(_psEffectiveRaw, _psTCur, _psVCur);
        _psPrice = (_psConv !== null) ? CurrencyService.format(_psConv, _psVCur) : CurrencyService.format(_psEffectiveRaw, _psTCur);
      } else {
        _psPrice = CurrencyService.format(_psEffectiveRaw, _psTCur);
      }
    } else {
      _psPrice = '\u20ac' + _psEffectiveRaw;
    }
    statsHTML += '<span class="profile-sheet-stat">' + _psPrice + ' / 30 min</span>';
  }

  /* Role badge */
  var roleLabel = user && user.role === 'teacher' ? 'Lehrer' : 'Schüler';
  var roleHTML  = '<span class="profile-sheet-role-badge">' + esc(roleLabel) + '</span>';

  /* Bio */
  var bioHTML = p.bio
    ? '<div class="profile-sheet-section"><p class="profile-sheet-bio">' + esc(p.bio) + '</p></div>'
    : '';

  var overlay = document.createElement('div');
  overlay.id = 'profile-sheet-overlay';
  overlay.className = 'profile-sheet-backdrop';
  overlay.innerHTML =
    '<div class="profile-sheet-panel" role="dialog" aria-modal="true">' +
      '<div class="wtx-detail-handle"></div>' +
      '<div class="profile-sheet-header">' +
        '<div class="profile-sheet-avatar-col">' + avatarHTML + '</div>' +
        '<div class="profile-sheet-info-col">' +
          '<div class="profile-sheet-name">' + esc(p.name || uid) + '</div>' +
          roleHTML +
          (locationHTML ? locationHTML : '') +
          (statsHTML ? '<div class="profile-sheet-stats">' + statsHTML + '</div>' : '') +
          langsHTML +
        '</div>' +
        '<button class="wtx-detail-close" id="profile-sheet-close" aria-label="Schließen">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="profile-sheet-body">' + bioHTML + '</div>' +
      '<div class="profile-sheet-footer">' +
        '<a class="btn btn-secondary profile-sheet-link" href="./profile-view.html?uid=' + esc(uid) + '&viewer=' + esc((typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().uid : '') + '">' +
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1a4 4 0 100 8A4 4 0 008 1zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          'Vollständiges Profil' +
        '</a>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  function closeSheet() {
    overlay.classList.remove('is-open');
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
  }

  document.getElementById('profile-sheet-close').addEventListener('click', closeSheet);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSheet(); });
  document.addEventListener('keydown', function esc2(e) {
    if (e.key === 'Escape') { closeSheet(); document.removeEventListener('keydown', esc2); }
  });

  requestAnimationFrame(function() { overlay.classList.add('is-open'); });
}
window.showProfileSheet = showProfileSheet;

/* ── Shared filter helpers — eine Logik für alle drei Tabs ── */
function _applyTimeFilter(slots, timeFilter, today) {
  if (timeFilter === 'past')     return slots.filter(function(s) { return s.date <  today; });
  if (timeFilter === 'upcoming') return slots.filter(function(s) { return s.date >= today; });
  return slots;
}
window._applyTimeFilter = _applyTimeFilter;

/* Apply optional date range filter after time filter */
function _applyDateRangeFilter(slots) {
  var from = bookingsFilter.dateFrom;
  var to   = bookingsFilter.dateTo;
  if (!from && !to) return slots;
  return slots.filter(function(s) {
    if (from && s.date < from) return false;
    if (to   && s.date > to)   return false;
    return true;
  });
}
window._applyDateRangeFilter = _applyDateRangeFilter;

function getStickyOffset() {
  var navbar = document.querySelector('.navbar');
  var dayNav = document.getElementById('day-nav-bar');
  var offset = 0;
  if (navbar) offset += navbar.offsetHeight;
  if (dayNav && dayNav.classList.contains('is-sticky')) offset += dayNav.offsetHeight;
  return offset + 8;
}
window.getStickyOffset = getStickyOffset;

function getCurrentSectionIndex(targets) {
  var offset = getStickyOffset();
  var scrollY = window.scrollY + offset + 10;
  var best = 0;
  for (var i = 0; i < targets.length; i++) {
    var top = targets[i].getBoundingClientRect().top + window.scrollY;
    if (top <= scrollY) best = i;
  }
  return best;
}
window.getCurrentSectionIndex = getCurrentSectionIndex;

/* ── Shared sort + date-range row ─────────────────────────
   Renders: [↑↓ Sort]  [Von ____ Bis ____]  [✕ Reset]
   onRerender: function to call after any change            */
function _buildSortDateRangeRow(onRerender) {
  var row = document.createElement('div');
  row.className = 'bookings-sort-date-row';

  /* Sort button */
  var sortBtn = document.createElement('button');
  sortBtn.className = 'btn btn-secondary btn-sm sort-btn-shared';
  sortBtn.setAttribute('aria-label', allBookingsSortAsc ? 'Älteste zuerst' : 'Neueste zuerst');
  sortBtn.innerHTML =
    '<span class="sort-icon-asc' + (allBookingsSortAsc ? '' : ' is-hidden') + '">' +
      '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</span>' +
    '<span class="sort-icon-desc' + (!allBookingsSortAsc ? '' : ' is-hidden') + '">' +
      '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 12V2M3 6l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</span>';
  sortBtn.addEventListener('click', function() {
    allBookingsSortAsc = !allBookingsSortAsc;
    onRerender();
  });
  row.appendChild(sortBtn);

  /* Date-range: Von */
  var fromLbl = document.createElement('label');
  fromLbl.className = 'date-range-label';
  fromLbl.textContent = 'Von';
  var fromInput = document.createElement('input');
  fromInput.type = 'date';
  fromInput.className = 'date-range-input';
  fromInput.value = bookingsFilter.dateFrom;
  fromInput.addEventListener('change', function() {
    _setFilter('dateFrom', fromInput.value);
    onRerender();
  });

  /* Date-range: Bis */
  var toLbl = document.createElement('label');
  toLbl.className = 'date-range-label';
  toLbl.textContent = 'Bis';
  var toInput = document.createElement('input');
  toInput.type = 'date';
  toInput.className = 'date-range-input';
  toInput.value = bookingsFilter.dateTo;
  toInput.addEventListener('change', function() {
    _setFilter('dateTo', toInput.value);
    onRerender();
  });

  /* Reset button — only visible when a date is set */
  var resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost btn-sm date-range-reset' + (bookingsFilter.dateFrom || bookingsFilter.dateTo ? '' : ' is-hidden');
  resetBtn.textContent = '✕';
  resetBtn.setAttribute('aria-label', 'Datumsfilter zurücksetzen');
  resetBtn.addEventListener('click', function() {
    _setFilter('dateFrom', '');
    _setFilter('dateTo', '');
    onRerender();
  });

  /* Row A: Von [input]  [sort btn] */
  var rowA = document.createElement('div');
  rowA.className = 'date-range-row';
  rowA.appendChild(fromLbl);
  rowA.appendChild(fromInput);
  rowA.appendChild(sortBtn);

  /* Row B: Bis [input]  [reset] */
  var rowB = document.createElement('div');
  rowB.className = 'date-range-row';
  rowB.appendChild(toLbl);
  rowB.appendChild(toInput);
  rowB.appendChild(resetBtn);

  row.appendChild(rowA);
  row.appendChild(rowB);
  return row;
}
window._buildSortDateRangeRow = _buildSortDateRangeRow;

/* Shared student filter row — custom dropdown that calls onRerender on change */
function _buildStudentFilterRow(onRerender) {
  var myStudents = AppService.getSelectionsByTeacherSync
    ? AppService.getSelectionsByTeacherSync(Auth.current().uid)
        .map(function(sel) { return AppService.getUserSync(sel.studentId); }).filter(Boolean)
    : [];

  var row = document.createElement('div');
  row.className = 'day-bookings-filter-row';
  var lbl = document.createElement('span');
  lbl.className = 'day-bookings-filter-label';
  lbl.textContent = 'Schüler';

  var ddWrap = document.createElement('div');
  ddWrap.className = 'custom-dropdown day-bookings-student-dd';
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-dropdown-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  var labelSpan = document.createElement('span');
  labelSpan.className = 'custom-dropdown-label';
  trigger.innerHTML = '';
  trigger.appendChild(labelSpan);
  trigger.insertAdjacentHTML('beforeend', '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');

  var list = document.createElement('ul');
  list.className = 'custom-dropdown-list';
  list.setAttribute('role', 'listbox');

  var options = [{ value: 'all', text: 'Alle Schüler' }];
  for (var i = 0; i < myStudents.length; i++) {
    options.push({ value: myStudents[i].uid, text: ProfileStore.getDisplayName(myStudents[i].uid) });
  }

  function setValue(val) {
    _setFilter('student', val);
    var sel = options.filter(function(o) { return o.value === val; })[0] || options[0];
    labelSpan.textContent = sel.text;
    list.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
      el.classList.toggle('is-active', el.getAttribute('data-value') === val);
    });
    list.classList.remove('is-open');
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    onRerender();
  }

  options.forEach(function(opt) {
    var li = document.createElement('li');
    li.className = 'custom-dropdown-item' + (opt.value === bookingsFilter.student ? ' is-active' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('data-value', opt.value);
    li.textContent = opt.text;
    li.addEventListener('click', function(e) { e.stopPropagation(); setValue(opt.value); });
    list.appendChild(li);
  });

  var cur = options.filter(function(o) { return o.value === bookingsFilter.student; })[0] || options[0];
  labelSpan.textContent = cur.text;

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var open = list.classList.contains('is-open');
    list.classList.toggle('is-open', !open);
    trigger.classList.toggle('is-open', !open);
    trigger.setAttribute('aria-expanded', !open ? 'true' : 'false');
  });

  ddWrap.appendChild(trigger);
  ddWrap.appendChild(list);
  row.appendChild(lbl);
  row.appendChild(ddWrap);
  return row;
}
window._buildStudentFilterRow = _buildStudentFilterRow;

/**
 * _buildTimeFilterRow — shared time filter (Vergangen/Kommende/Alle).
 * onFilter: function(key) called after filter is set (re-render hook)
 */
function _buildTimeFilterRow(onFilter) {
  var row = document.createElement('div');
  row.className = 'booking-time-filter';
  [{ key: 'past', label: 'Vergangen' }, { key: 'upcoming', label: 'Kommende' }, { key: 'all', label: 'Alle' }]
    .forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'booking-time-btn' + (bookingsFilter.time === t.key ? ' active' : '');
      btn.textContent = t.label;
      btn.addEventListener('click', function() {
        _setFilter('time', t.key);
        allBookingsSortAsc = (t.key !== 'past');
        row.querySelectorAll('.booking-time-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        onFilter(t.key);
      });
      row.appendChild(btn);
    });
  return row;
}
window._buildTimeFilterRow = _buildTimeFilterRow;

/**
 * _buildConfirmFilterRow — shared confirm filter with optional count+price badges.
 * opts.counts:   { all, unconfirmed, confirmed, totalAll, totalUnconfirmed, totalConfirmed } | null
 * opts.onFilter: function(key) called after filter is set
 */
function _buildConfirmFilterRow(opts) {
  var counts   = opts.counts || null;
  var onFilter = opts.onFilter;
  var row = document.createElement('div');
  row.className = 'booking-confirm-filter';
  [
    { key: 'all',         label: 'Alle',            countKey: 'all',         totalKey: 'totalAll' },
    { key: 'unconfirmed', label: 'Unbestätigt',      countKey: 'unconfirmed', totalKey: 'totalUnconfirmed' },
    { key: 'confirmed',   label: 'Bestätigt \u2713', countKey: 'confirmed',   totalKey: 'totalConfirmed' }
  ].forEach(function(c) {
    var btn = document.createElement('button');
    btn.className = 'booking-confirm-btn' + (bookingsFilter.confirmed === c.key ? ' active' : '');
    btn.setAttribute('data-confirm', c.key);
    btn.textContent = c.label + ' ';
    if (counts) {
      var badge = document.createElement('span');
      badge.className = 'booking-confirm-count';
      badge.textContent = counts[c.countKey] || 0;
      btn.appendChild(badge);
      var total = counts[c.totalKey] || 0;
      if (total > 0) {
        var priceSpan = document.createElement('span');
        priceSpan.className = 'booking-price-badge';
        priceSpan.textContent = _fmtForUser(total, _getActorUid());
        btn.appendChild(priceSpan);
      }
    }
    btn.addEventListener('click', function() {
      _setFilter('confirmed', c.key);
      row.querySelectorAll('.booking-confirm-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      onFilter(c.key);
    });
    row.appendChild(btn);
  });
  return row;
}
window._buildConfirmFilterRow = _buildConfirmFilterRow;

/**
 * _buildCancelPolicyBody — builds HTML body for a cancellation policy dialog.
 * policy: result of AppService.calcCancellationPolicy
 */
function _buildCancelPolicyBody(policy, teacherName, time, endTime, dateStr, actorUid) {
  var tierLabels = {
    full_refund:    { text: 'Volle Rückerstattung', color: '#166534', bg: '#dcfce7' },
    partial:        { text: 'Teilrückerstattung',   color: '#7a5c00', bg: '#fef9ec' },
    forfeit:        { text: 'Kein Deposit zurück',  color: '#991b1b', bg: '#fee2e2' },
    teacher_cancel: { text: 'Volle Rückerstattung', color: '#166534', bg: '#dcfce7' },
    no_escrow:      { text: 'Kein Betrag betroffen', color: '#374151', bg: '#f3f4f6' }
  };
  var tier      = policy ? policy.tier : 'no_escrow';
  var tl        = tierLabels[tier] || tierLabels.no_escrow;
  var noticeStr = policy && policy.noticeHours !== null
    ? (policy.noticeHours >= 24
        ? Math.floor(policy.noticeHours / 24) + 'd ' + Math.floor(policy.noticeHours % 24) + 'h'
        : Math.floor(policy.noticeHours) + 'h ' + Math.round((policy.noticeHours % 1) * 60) + 'min')
    : '—';

  var moneyLine = '';
  if (policy && policy.refundAmount > 0) {
    moneyLine = '<p class="confirm-money-line">Rückerstattung: <strong>' + _fmtForUser(policy.refundAmount, actorUid) + '</strong></p>';
  }
  if (policy && policy.forfeitAmount > 0) {
    moneyLine += '<p class="confirm-money-line">Einbehalten (Lehrer): <strong>' + _fmtForUser(policy.forfeitAmount, actorUid) + '</strong></p>';
  }
  if (policy && policy.depositAmount === 0) {
    var reason = policy.noEscrowReason;
    var reasonText = reason === 'cash_on_site'  ? 'Zahlung bar vor Ort — kein Deposit hinterlegt.'
                   : reason === 'deposit_unpaid' ? 'Deposit wurde noch nicht bezahlt — keine Rückerstattung.'
                   : 'Kein Deposit hinterlegt — keine Zahlung betroffen.';
    moneyLine = '<p class="confirm-money-line text-muted">' + reasonText + '</p>';
  }

  return '<div class="move-dialog">' +
    '<p class="move-dialog-info"><strong>' + (teacherName || '') + '</strong></p>' +
    '<p>' + (time || '') + ' \u2013 ' + (endTime || '') + ' &nbsp;&bull;&nbsp; ' + (dateStr || '') + '</p>' +
    '<p class="confirm-notice-text">Verbleibende Zeit bis zur Stunde: <strong>' + noticeStr + '</strong></p>' +
    (policy && policy.bookedByTeacher ? '<p class="confirm-notice-text confirm-notice-info">&#9432; Diese Stunde wurde vom Lehrer eingeplant — volle Rückerstattung.</p>' : '') +
    '<div class="confirm-tier-badge" style="background:' + tl.bg + ';color:' + tl.color + '">' +
      tl.text +
    '</div>' +
    moneyLine +
  '</div>';
}
/* ── _buildConfirmDetailBody — shared confirm dialog body ── */
/*
 * Builds rich HTML for booking/slot confirmation dialogs.
 * opts: { teacherName, studentName, dateLabel, timeStart, timeEnd,
 *          escrow, walletBalance, actorRole }
 * actorRole: 'teacher' | 'student'
 */
function _buildConfirmDetailBody(opts) {
  var escrow       = opts.escrow || null;
  var balance      = (opts.walletBalance != null) ? parseFloat(opts.walletBalance) : null;
  var actorUid     = opts.actorUid || null;
  var actorRole    = opts.actorRole || 'student';
  var partyName    = actorRole === 'teacher' ? (opts.studentName || '?') : (opts.teacherName || '?');
  var partyLabel   = actorRole === 'teacher' ? 'Schüler' : 'Lehrer';

  var depositAmount = escrow ? (parseFloat(escrow.depositAmount)  || 0) : 0;
  var fullAmount    = escrow ? (parseFloat(escrow.fullAmount)      || 0) : 0;
  var depositStatus = escrow ? (escrow.depositStatus || 'unpaid') : null;
  var paymentMode   = escrow ? (escrow.paymentMode  || 'instant') : 'instant';
  var requiresDep   = escrow ? (escrow.requiresDeposit !== false) : false;
  var depositPct    = escrow ? escrow.depositPercent : null;
  var depositType   = escrow ? (escrow.depositType || 'fixed') : 'fixed';

  var isDepositHeld = depositStatus === 'held';
  var isCash        = paymentMode === 'cash_on_site';
  var releaseNow    = isCash ? 0 : (isDepositHeld ? Math.round((fullAmount - depositAmount) * 100) / 100 : fullAmount);
  if (releaseNow < 0) releaseNow = 0;
  var balanceAfter  = (balance !== null && !isCash && releaseNow > 0) ? Math.round((balance - releaseNow) * 100) / 100 : null;

  var depLabel = requiresDep
    ? (depositType === 'percent' && depositPct != null ? 'Deposit (' + depositPct + '%)' : 'Deposit (pauschal)')
    : 'Kein Deposit';

  var depBadge = isDepositHeld
    ? '<span class="status-confirmed">&#10003; bezahlt</span>'
    : (depositAmount > 0 ? '<span class="status-pending">&#9888; ausstehend</span>'
       : '<span class="text-muted">—</span>');

  var rows = '';
  if (fullAmount > 0) rows += '<div class="confirm-detail-row"><span>Vollpreis</span><strong>' + _fmtForUser(fullAmount, actorUid) + '</strong></div>';
  if (requiresDep && depositAmount > 0) rows += '<div class="confirm-detail-row"><span>' + depLabel + '</span><span>' + _fmtForUser(depositAmount, actorUid) + ' ' + depBadge + '</span></div>';
  if (!isCash && releaseNow > 0) rows += '<div class="confirm-detail-row confirm-detail-release"><span>Jetzt freizugeben</span><strong class="confirm-release-amount">' + _fmtForUser(releaseNow, actorUid) + '</strong></div>';
  if (!isCash && balanceAfter !== null) {
    var balCol = balanceAfter >= 0 ? '#16a34a' : '#dc2626';
    rows += '<div class="confirm-detail-row confirm-detail-balance-row"><span>Guthaben danach</span><strong style="color:' + balCol + '">' + _fmtForUser(balanceAfter, actorUid) + '</strong></div>';
  }
  if (isCash) rows += '<div class="confirm-detail-row"><span>Zahlung</span><span class="text-muted">Bar vor Ort</span></div>';

  return '<div class="move-dialog confirm-dialog-detail">'
    + '<div class="confirm-detail-header">'
      + '<strong>' + partyName + '</strong>'
      + (opts.dateLabel ? '<span class="confirm-detail-datetime">' + opts.dateLabel + ' &bull; ' + (opts.timeStart||'') + ' &ndash; ' + (opts.timeEnd||'') + '</span>' : '')
    + '</div>'
    + (rows ? '<div class="confirm-detail-payment"><div class="confirm-detail-section-title">Zahlung</div>' + rows + '</div>' : '')
    + '<p class="confirm-dialog-warning">&#9888; Nach der Best\u00e4tigung kann diese Buchung <strong>nicht mehr storniert</strong> werden.</p>'
  + '</div>';
}
window._buildConfirmDetailBody = _buildConfirmDetailBody;

window._buildCancelPolicyBody = _buildCancelPolicyBody;

/**
 * _showCancelPolicyDialog — shows policy warning then stages cancel.
 * slot: original slot object
 * pendingMap: pendingDayChanges or pendingBookings
 * onAction: re-render callback
 * teacherName, time, endTime, dateStr: display strings
 */
function _showCancelPolicyDialog(slot, pendingMap, onAction, teacherName, time, endTime, dateStr, actorRole) {
  var role = actorRole || 'student';
  AppService.calcCancellationPolicy(slot.slotId, role, function(err, policy) {
    var actorUid   = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
    var policyBody = _buildCancelPolicyBody(policy, teacherName || '', time || slot.time, endTime || '', dateStr || slot.date, actorUid);
    var modal = Modal.show({
      title: 'Stornierung bestätigen',
      bodyHTML: policyBody,
      footerHTML:
        '<button class="btn btn-ghost" id="modal-cancel-policy">Abbrechen</button>' +
        '<button class="btn btn-danger" id="modal-confirm-policy">Jetzt stornieren</button>'
    });
    document.getElementById('modal-cancel-policy').addEventListener('click', modal.close);
    document.getElementById('modal-confirm-policy').addEventListener('click', function() {
      modal.close();
      /* Execute cancellation + escrow settlement immediately */
      AppService.cancelSlotWithPolicy(slot.slotId, role, function(e) {
        if (e) {
          Toast.error(e.message || e);
        } else {
          /* Also stage in pendingMap so UI reflects the cancel state */
          var original = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === slot.slotId; })[0] || slot;
          if (pendingMap) pendingMap[slot.slotId] = { action: 'cancel', originalSlot: original, newStudentId: null };
          /* Success feedback with refund amount */
          if (policy && policy.refundAmount > 0) {
            Toast.success('Stornierung erfolgreich. ' + _fmtForUser(policy.refundAmount, actorUid) + ' werden zurückgebucht.');
          } else if (policy && policy.forfeitAmount > 0) {
            Toast.info('Stornierung erfolgreich. Deposit von ' + _fmtForUser(policy.forfeitAmount, actorUid) + ' wird einbehalten.');
          } else {
            Toast.success('Stornierung erfolgreich.');
          }
          /* Refresh navbar wallet immediately */
          var walletEl = document.getElementById('navbar-wallet-amount');
          if (walletEl && typeof AppService !== 'undefined') {
            var wUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
            if (wUid) {
              AppService.getWallet(wUid, function(we, wallet) {
                if (!we && wallet) walletEl.textContent = _fmtForUser(wallet.balance, wUid);
              });
              /* Refresh embedded wallet panel so refund appears without tab switch */
              if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(wUid);
            }
          }
        }
        if (onAction) onAction();
      });
    });
  });
}
window._showCancelPolicyDialog = _showCancelPolicyDialog;

/**
 * _showCancelBlockPolicyDialog — policy dialog for an entire block (multiple slots).
 * Calculates policy from first slot (tier same for all), sums deposits across all slots.
 * Cancels ALL slots on confirm.
 */
function _showCancelBlockPolicyDialog(slots, pendingMap, onAction, teacherName, blockStart, blockEnd, dateStr, actorRole) {
  var role = actorRole || 'student';
  if (!slots || !slots.length) { if (onAction) onAction(); return; }

  /* Get policy from first slot — tier is identical for all (same teacher/date) */
  AppService.calcCancellationPolicy(slots[0].slotId, role, function(err, policy) {
    /* Sum deposits across all slots */
    var totalDeposit  = 0;
    var totalRefund   = 0;
    var totalForfeit  = 0;
    var pending       = slots.length;
    var policies      = [];

    function onPolicyLoaded(p) {
      if (p) {
        policies.push(p);
        totalDeposit += p.depositAmount || 0;
        totalRefund  += p.refundAmount  || 0;
        totalForfeit += p.forfeitAmount || 0;
      }
      pending--;
      if (pending > 0) return;

      /* Round */
      totalDeposit = Math.round(totalDeposit * 100) / 100;
      totalRefund  = Math.round(totalRefund  * 100) / 100;
      totalForfeit = Math.round(totalForfeit * 100) / 100;

      /* Build aggregate policy for display */
      var aggPolicy = {
        tier:          policy ? policy.tier : 'no_escrow',
        noticeHours:   policy ? policy.noticeHours : null,
        depositAmount: totalDeposit,
        refundAmount:  totalRefund,
        forfeitAmount: totalForfeit,
        paymentMode:   policy ? policy.paymentMode : 'instant',
        noEscrowReason: policy ? policy.noEscrowReason : null
      };

      var slotCount  = slots.length;
      var actorUid   = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
      var policyBody = _buildCancelPolicyBody(aggPolicy, teacherName || '', blockStart, blockEnd || '', dateStr, actorUid);
      /* Append slot count info */
      policyBody = policyBody.replace('</div>', '') +
        '<p class="confirm-notice-text">' + slotCount + ' Zeitslot' + (slotCount !== 1 ? 's' : '') + ' werden storniert</p>' +
        '</div>';

      var modal = Modal.show({
        title: 'Block stornieren',
        bodyHTML: policyBody,
        footerHTML:
          '<button class="btn btn-ghost" id="modal-cancel-block-policy">Abbrechen</button>' +
          '<button class="btn btn-danger" id="modal-confirm-block-policy">Alle ' + slotCount + ' Slots stornieren</button>'
      });

      document.getElementById('modal-cancel-block-policy').addEventListener('click', modal.close);
      document.getElementById('modal-confirm-block-policy').addEventListener('click', function() {
        modal.close();
        AppService.cancelBlockWithPolicy(slots, role, function(err) {
          if (err) {
            Toast.error('Teilfehler: ' + (err.message || err));
          } else if (totalRefund > 0) {
            Toast.success('Stornierung erfolgreich. ' + _fmtForUser(totalRefund, actorUid) + ' werden zurückgebucht.');
          } else if (totalForfeit > 0) {
            Toast.info('Stornierung erfolgreich. Deposit von ' + _fmtForUser(totalForfeit, actorUid) + ' wird einbehalten.');
          } else {
            Toast.success('Stornierung erfolgreich.');
          }
          /* Update pending map for all slots */
          slots.forEach(function(s) {
            var original = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0] || s;
            if (pendingMap) pendingMap[s.slotId] = { action: 'cancel', originalSlot: original, newStudentId: null };
          });
          /* Refresh navbar wallet */
          var walletEl = document.getElementById('navbar-wallet-amount');
          if (walletEl) {
            var wUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
            if (wUid) {
              AppService.getWallet(wUid, function(we, w) {
                if (!we && w) walletEl.textContent = _fmtForUser(w.balance, wUid);
              });
              if (typeof WalletPanel !== 'undefined') WalletPanel.refresh(wUid);
            }
          }
          if (onAction) onAction();
        });
      });
    }

    /* Load policy for all slots in parallel to get accurate total deposits */
    slots.forEach(function(s) {
      AppService.calcCancellationPolicy(s.slotId, role, function(e, p) {
        onPolicyLoaded(p || null);
      });
    });
  });
}
window._showCancelBlockPolicyDialog = _showCancelBlockPolicyDialog;

function _navDayShared(delta, renderFn) {
  if (!selectedDate) return;
  var d = new Date(selectedDate);
  d.setDate(d.getDate() + delta);
  selectedDate = d;
  if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) {
    viewYear  = d.getFullYear();
    viewMonth = d.getMonth();
  }
  updateDayNavBar();
  renderCalendar();
  renderFn();
}
window._navDayShared = _navDayShared;

function _navMonthShared(delta, renderFn) {
  if (!selectedDate) return;
  var d = new Date(selectedDate);
  d.setMonth(d.getMonth() + delta);
  selectedDate = d;
  viewYear  = d.getFullYear();
  viewMonth = d.getMonth();
  updateDayNavBar();
  renderCalendar();
  renderFn();
}
window._navMonthShared = _navMonthShared;

/* checkDayNavSticky — shared, containerId injected per-file */
function checkDayNavStickyShared(containerId) {
  /* Target the sticky wrapper (nav bar + tabs) — mockup-dayTabNav-sticky-2026-03-24_09-49 */
  var bar      = document.getElementById('day-nav-bar');
  var header   = document.getElementById('day-sticky-header') || bar;
  var sentinel = document.getElementById('day-nav-sentinel');
  if (!bar || !sentinel || !bar.classList.contains('is-visible')) return;
  /* navbar-aware: if navbar is hidden, sticky threshold is top of screen */
  var navbarH = document.body.classList.contains('navbar-is-hidden') ? 0 : 52;
  var rect = sentinel.getBoundingClientRect();
  var shouldBeSticky = rect.top < navbarH;
  if (shouldBeSticky === window._dayNavStickyActive) return;
  window._dayNavStickyActive = shouldBeSticky;
  /* Apply is-sticky to the wrapper, keep on bar for back-compat */
  header.classList.toggle('is-sticky', shouldBeSticky);
  bar.classList.toggle('is-sticky', shouldBeSticky);
  if (shouldBeSticky) {
    var parent = document.getElementById(containerId);
    if (parent) {
      var pr = parent.getBoundingClientRect();
      header.style.left  = pr.left + 'px';
      header.style.width = pr.width + 'px';
      header.style.right = 'auto';
    }
    /* Spacer height = full sticky header (nav bar + tabs) */
    sentinel.style.height = header.offsetHeight + 'px';
  } else {
    header.style.left  = '';
    header.style.width = '';
    header.style.right = '';
    sentinel.style.height = '0';
  }
}
window.checkDayNavStickyShared = checkDayNavStickyShared;

/* updateDayNavBar — identical in both files */
function updateDayNavBar() {
  var bar    = document.getElementById('day-nav-bar');
  var header = document.getElementById('day-sticky-header') || bar;
  var label  = document.getElementById('day-nav-label');
  if (!bar || !label) return;
  if (!selectedDate) {
    bar.classList.remove('is-visible');
    bar.classList.remove('is-sticky');
    header.classList.remove('is-sticky');
    window._dayNavStickyActive = false;
    /* Hide recurring bar too */
    var recurBar = document.getElementById('day-recur-bar');
    if (recurBar) recurBar.classList.add('is-hidden');
    return;
  }
  bar.classList.add('is-visible');
  label.textContent = selectedDate.toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  /* Show recurring bar only when a teacher is selected */
  var recurBar = document.getElementById('day-recur-bar');
  if (recurBar) {
    var hasTeacher = (typeof activeTeacherId !== 'undefined') && !!activeTeacherId;
    recurBar.classList.toggle('is-hidden', !hasTeacher);
  }
}
window.updateDayNavBar = updateDayNavBar;

/* _setFilter — shared by teacher.js and student.js */
function _setFilter(key, val) { bookingsFilter[key] = val; }
window._setFilter = _setFilter;

/* jumpSection — shared, calls local getSectionJumpTargets via window */
function jumpSection(delta) {
  var targets = getSectionJumpTargets();
  var idx     = getCurrentSectionIndex(targets);
  var next    = idx + delta;
  if (next < 0 || next >= targets.length) return;
  var target  = targets[next];
  var offset  = getStickyOffset();
  var top     = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: top, behavior: 'smooth' });
  setTimeout(updateJumpBtns, 400);
}
window.jumpSection = jumpSection;

/* updateJumpBtns — shared core, visibilityExtra passed by each file's local wrapper */
function _updateJumpBtnsShared(visibilityExtra) {
  var jumper  = document.getElementById('section-jumper');
  var targets = getSectionJumpTargets();
  var idx     = getCurrentSectionIndex(targets);
  var upBtn   = document.getElementById('jump-up');
  var downBtn = document.getElementById('jump-down');
  if (!upBtn || !downBtn || !jumper) return;
  var navbarH = (document.querySelector('.navbar') || {}).offsetHeight || 0;
  var isVisible = window.scrollY > navbarH || visibilityExtra;
  jumper.classList.toggle('is-visible', isVisible);
  upBtn.classList.toggle('is-dimmed', idx <= 0);
  downBtn.classList.toggle('is-dimmed', idx >= targets.length - 1);
}
window._updateJumpBtnsShared = _updateJumpBtnsShared;

/* prevMonth/nextMonth shared cores */
function _prevMonthShared(extraRenderFn) {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
  if (extraRenderFn) extraRenderFn();
}
function _nextMonthShared(extraRenderFn) {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
  if (extraRenderFn) extraRenderFn();
}
window._prevMonthShared = _prevMonthShared;
window._nextMonthShared = _nextMonthShared;

/* ══════════════════════════════════════════════════════════
   SHARED BOOKING BLOCK FUNCTIONS
   Used by both teacher.js and student.js
══════════════════════════════════════════════════════════ */

/**
 * mergeBookingBlocks — shared merge for teacher (groupField='studentId')
 * and student (groupField='teacherId').
 * Returns blocks with: dateStr, today, start, end, bookedSlots,
 *   hasPending, isFullyConfirmed, plus whatever resolveParty() returns merged in.
 *
 * opts.groupField   — 'studentId' | 'teacherId'
 * opts.resolveParty — function(slot) → party object merged into block
 */
function mergeBookingBlocks(dateStr, bookedSlots, today, opts) {
  var groupField   = opts.groupField;
  var resolveParty = opts.resolveParty || function() { return {}; };
  var viewerUid    = opts.viewerUid || null;
  var blocks = [];

  /* Convert a UTC "HH:MM" to local display time for viewerUid.
     Falls back to UTC string when TimezoneService is unavailable or no uid. */
  function _toDisplay(utcTime) {
    if (!viewerUid || typeof TimezoneService === 'undefined') return utcTime;
    var tz = TimezoneService.getUserTimezone(viewerUid);
    return TimezoneService.utcToLocal(utcTime, dateStr, tz).localTime;
  }

  var sorted = bookedSlots.slice().sort(function(a, b) {
    return (a[groupField] || '').localeCompare(b[groupField] || '') || a.time.localeCompare(b.time);
  });

  var i = 0;
  while (i < sorted.length) {
    var s      = sorted[i];
    var endUtc = AppService.slotEndTime(s.time);
    var grp    = [s];
    var j      = i + 1;
    while (j < sorted.length) {
      var next = sorted[j];
      if (next[groupField] === s[groupField] && next.time <= endUtc) {
        var nextEnd = AppService.slotEndTime(next.time);
        if (nextEnd > endUtc) endUtc = nextEnd;
        grp.push(next);
        j++;
      } else { break; }
    }
    var block = {
      dateStr:          dateStr,
      today:            today,
      startUtc:         s.time,          /* raw UTC — for slot lookups and logic */
      endUtc:           endUtc,          /* raw UTC — for slot lookups and logic */
      start:            _toDisplay(s.time),   /* local display time */
      end:              _toDisplay(endUtc),   /* local display time */
      bookedSlots:      grp,
      hasPending:       grp.some(function(x) { return !!x._pending; }),
      isFullyConfirmed: grp.every(function(x) { return !!x.confirmedAt; })
    };
    var party = resolveParty(s);
    for (var k in party) block[k] = party[k];
    blocks.push(block);
    i = j;
  }
  blocks.sort(function(a, b) { return a.startUtc.localeCompare(b.startUtc); });
  return blocks;
}
window.mergeBookingBlocks = mergeBookingBlocks;

/**
 * fmtPrice — shared price formatter. Returns "€12,50" or "" if no price.
 */
function fmtPrice(amount, currencyCode) {
  var n = parseFloat(amount);
  if (!amount || isNaN(n) || n <= 0) return '';
  /* Use CurrencyService if loaded, else fall back to EUR */
  if (typeof CurrencyService !== 'undefined') {
    return CurrencyService.format(n, currencyCode || 'EUR');
  }
  return '\u20ac' + n.toFixed(2).replace('.', ',');
}
window.fmtPrice = fmtPrice;

/**
 * _fmtForUser(amountEUR, uid) — formats an EUR amount in the user's displayCurrency.
 * Falls back to EUR if CurrencyService is unavailable or cache is cold.
 * uid: the logged-in user's uid (reads displayCurrency from ProfileStore).
 */
function _fmtForUser(amountEUR, uid) {
  if (typeof CurrencyService === 'undefined') return fmtPrice(amountEUR, 'EUR');
  var cur = (uid && typeof ProfileStore !== 'undefined')
    ? CurrencyService.getUserCurrency(uid)
    : 'EUR';
  if (!cur || cur === 'EUR') return fmtPrice(amountEUR, 'EUR');
  var converted = CurrencyService.convertSync(amountEUR, 'EUR', cur);
  if (converted === null) return fmtPrice(amountEUR, 'EUR');
  return CurrencyService.format(converted, cur);
}
window._fmtForUser = _fmtForUser;

/* ── HTML escape — shared utility used by recurring dialog and others ── */
/* ── Shared timezone display helpers ────────────────────────────────────
   Called from ui.js, teacher.js, student.js, dashboard.js
   viewerUid: logged-in user whose TZ is used for display
   Falls back to UTC string if TimezoneService not available            */
function _tViewerTime(utcTimeStr, dateStr, viewerUid) {
  if (!utcTimeStr) return utcTimeStr || '';
  if (typeof TimezoneService === 'undefined') return utcTimeStr;
  var uid = viewerUid || (typeof Auth !== 'undefined' && Auth.current() ? Auth.current().uid : null);
  var tz  = TimezoneService.getUserTimezone(uid);
  return TimezoneService.utcToLocal(utcTimeStr, dateStr || '', tz).localTime;
}

function _tViewerEndTime(utcTimeStr, dateStr, viewerUid) {
  var local = _tViewerTime(utcTimeStr, dateStr, viewerUid);
  return AppService.slotEndTime(local);
}

/* ── _buildLocalOrderedUtcTimes ─────────────────────────────────────────
   Shared by teacher.js (Day View + Week Grid) and student.js (Week Grid).
   Returns 48 UTC "HH:MM" strings covering a full 24h day, ordered so that
   index 0 = local 00:00, index 1 = local 00:30, ..., index 47 = local 23:30.
   dateStr: ISO reference date for DST-correct offset (use Monday of the week).
   uid:     the viewer whose TZ is applied. */
function _buildLocalOrderedUtcTimes(dateStr, uid) {
  var offsetMin = 0;
  if (typeof TimezoneService !== 'undefined' && uid) {
    var tz = TimezoneService.getUserTimezone(uid);
    offsetMin = TimezoneService.getOffsetMinutes(tz, dateStr || fmtDate(new Date()));
  }
  var midnightUtcMin = ((-offsetMin) % 1440 + 1440) % 1440;
  var times = [];
  for (var i = 0; i < 48; i++) {
    var m  = (midnightUtcMin + i * 30) % 1440;
    var h  = Math.floor(m / 60);
    var mm = m % 60;
    times.push((h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm);
  }
  return times;
}
window._buildLocalOrderedUtcTimes = _buildLocalOrderedUtcTimes;

/* ── buildTeacherSearchCombo ─────────────────────────────────────────────
   Builds a search input with live dropdown of teacher results.
   teachers: array of { uid, name, discipline, price, availCount, photo }
   onSelect(uid): called when user clicks a result
   containerId: id of the container where teacher cards live (for highlight)
   mockup-renderCatalog-searchDropdown-2026-03-24_11-44                  */
function buildTeacherSearchCombo(inputId, placeholder, teachers, onSelect, containerId) {
  var wrap = document.createElement('div');
  wrap.className = 'catalog-search-combo';

  /* Input row */
  var inputWrap = document.createElement('div');
  inputWrap.className = 'catalog-search-input-wrap';

  var iconEl = document.createElement('span');
  iconEl.className = 'catalog-search-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = inputId;
  input.className = 'catalog-search-input';
  input.placeholder = placeholder || 'Suchen…';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-label', placeholder || 'Suchen');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-haspopup', 'listbox');

  var clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'catalog-search-clear is-hidden';
  clearBtn.setAttribute('aria-label', 'Suche löschen');
  clearBtn.innerHTML = '&times;';

  inputWrap.appendChild(iconEl);
  inputWrap.appendChild(input);
  inputWrap.appendChild(clearBtn);

  /* Results dropdown */
  var results = document.createElement('div');
  results.className = 'catalog-search-results';
  results.setAttribute('role', 'listbox');

  wrap.appendChild(inputWrap);
  wrap.appendChild(results);

  /* Disc labels */
  var _DISC = { ski:'Ski', snowboard:'Snowboard', paragliding:'Paragliding',
    climbing:'Klettern', diving:'Tauchen', telemark:'Telemark', nordic:'Langlauf' };

  function _highlight(text, query) {
    if (!query) return _esc(text);
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return _esc(text);
    return _esc(text.slice(0, idx)) +
      '<mark>' + _esc(text.slice(idx, idx + query.length)) + '</mark>' +
      _esc(text.slice(idx + query.length));
  }

  function _open(query) {
    var q = (query || '').trim().toLowerCase();
    results.innerHTML = '';

    var matched = q ? teachers.filter(function(t) {
      return (t.name || '').toLowerCase().indexOf(q) !== -1;
    }) : teachers;

    if (!matched.length) {
      var noRes = document.createElement('div');
      noRes.className = 'catalog-search-no-results';
      noRes.textContent = 'Kein Lehrer gefunden.';
      results.appendChild(noRes);
    } else {
      for (var i = 0; i < matched.length; i++) {
        (function(t) {
          var item = document.createElement('div');
          item.className = 'catalog-search-result-item';
          item.setAttribute('role', 'option');
          item.setAttribute('data-uid', t.uid);

          var av = document.createElement('div');
          av.className = 'catalog-search-result-avatar';
          if (t.photo) {
            av.innerHTML = '<img src="' + _esc(t.photo) + '" alt="">';
          } else {
            av.textContent = (t.name || t.uid).charAt(0).toUpperCase();
          }

          var body = document.createElement('div');
          body.className = 'catalog-search-result-body';

          var nameEl = document.createElement('div');
          nameEl.className = 'catalog-search-result-name';
          nameEl.innerHTML = _highlight(t.name || t.uid, q);

          var meta = document.createElement('div');
          meta.className = 'catalog-search-result-meta';
          if (t.discipline && _DISC[t.discipline]) {
            var disc = document.createElement('span');
            disc.className = 'catalog-search-result-disc';
            disc.textContent = _DISC[t.discipline];
            meta.appendChild(disc);
          }
          if (t.price) {
            var priceNode = document.createTextNode(t.price + ' / 30min');
            meta.appendChild(priceNode);
          }
          if (t.availCount > 0) {
            var avNode = document.createTextNode(' · ' + t.availCount + ' freie Slots');
            meta.appendChild(avNode);
          }

          body.appendChild(nameEl);
          body.appendChild(meta);
          item.appendChild(av);
          item.appendChild(body);

          item.addEventListener('mousedown', function(e) {
            e.preventDefault(); /* prevent input blur before click fires */
          });
          item.addEventListener('click', function() {
            input.value = t.name || t.uid;
            clearBtn.classList.remove('is-hidden');
            _close();
            if (onSelect) onSelect(t.uid);
          });

          results.appendChild(item);
        })(matched[i]);
      }
    }
    results.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  }

  function _close() {
    results.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
  }

  function _clear() {
    input.value = '';
    clearBtn.classList.add('is-hidden');
    _close();
    /* Remove highlights + dims */
    if (containerId) {
      var container = document.getElementById(containerId);
      if (container) {
        var cards = container.querySelectorAll('.teacher-card, .tc-card');
        for (var ci = 0; ci < cards.length; ci++) {
          cards[ci].classList.remove('catalog-search-highlight', 'catalog-search-dim');
        }
      }
    }
    if (onSelect) onSelect(null); /* null = clear */
  }

  input.addEventListener('input', function() {
    var q = input.value.trim();
    clearBtn.classList.toggle('is-hidden', !q);
    if (q.length > 0) {
      _open(q);
    } else {
      _clear();
    }
  });

  input.addEventListener('focus', function() {
    if (input.value.trim()) _open(input.value.trim());
  });

  input.addEventListener('blur', function() {
    /* Delay close so click on result fires first */
    setTimeout(_close, 150);
  });

  clearBtn.addEventListener('click', function() { _clear(); input.focus(); });

  /* Close on outside click */
  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) _close();
  });

  return wrap;
}
window.buildTeacherSearchCombo = buildTeacherSearchCombo;

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window._esc = _esc;

/**
 * _getActorUid() — resolves the current logged-in user's uid.
 * Used by shared UI helpers that need the actor's displayCurrency.
 */
function _getActorUid() {
  if (typeof currentUser !== 'undefined' && currentUser) return currentUser.uid;
  if (typeof Auth !== 'undefined' && Auth.current) {
    var u = Auth.current();
    return u ? u.uid : null;
  }
  return null;
}
window._getActorUid = _getActorUid;

/**
 * buildBookingBlock — shared block renderer for teacher and student.
 *
 * opts.showDate        — bool
 * opts.isPast          — bool
 * opts.simpleDetail    — bool (teacher only)
 * opts.expandedBlocks  — object (keyed store for open state)
 * opts.blockKeyFn      — function(block) → string key
 * opts.nameFn          — function(block) → display name string
 * opts.onConfirmBlock  — function(block) → opens confirm dialog
 * opts.onEditBlock     — function(block) | null
 * opts.onReleaseBlock  — function(block) | null (teacher past confirmed)
 * opts.populateDetail  — function(detail, block) populates expanded content
 */
function buildBookingBlock(block, opts) {
  var showDate       = opts.showDate !== false;
  var isPast         = !!opts.isPast;
  var expandedBlocks = opts.expandedBlocks;
  var blockKey       = opts.blockKeyFn(block);
  var isOpen         = !!expandedBlocks[blockKey];
  var displayName    = opts.nameFn(block);

  var hasPending       = !!block.hasPending;
  var isFullyConfirmed = !!block.isFullyConfirmed;

  var wrapper = document.createElement('div');
  wrapper.className = 'all-booking-block-wrapper';

  var header = document.createElement('div');
  header.className = 'all-booking-block-header'
    + (isPast       ? ' all-booking-block-past' : '')
    + (hasPending   ? ' block-pending' : '');
  header.setAttribute('tabindex', '0');

  var timeEl = document.createElement('span');
  timeEl.className = 'all-booking-block-time';
  if (showDate) {
    var dateObj   = new Date(block.dateStr + 'T00:00:00');
    var dateLabel = dateObj.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
    timeEl.textContent = dateLabel + '  ' + block.start + ' \u2013 ' + block.end;
  } else {
    timeEl.textContent = block.start + ' \u2013 ' + block.end;
  }

  var nameEl = document.createElement('span');
  nameEl.className = 'all-booking-block-student';

  /* Avatar — only if buildAvatarHTML is available and we have a uid */
  var studentUid = block.student ? block.student.uid : null;
  if (studentUid && typeof buildAvatarHTML === 'function') {
    var avatarSpan = document.createElement('span');
    avatarSpan.className = 'all-booking-block-avatar';
    avatarSpan.innerHTML = buildAvatarHTML(studentUid, { size: 'sm', role: 'student' });
    nameEl.appendChild(avatarSpan);
  }
  var nameText = document.createElement('span');
  nameText.textContent = displayName;
  nameEl.appendChild(nameText);

  var chevron = document.createElement('span');
  chevron.className = 'all-booking-chevron' + (isOpen ? ' is-open' : '');
  chevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* Row 1: time + price total + chevron */
  var row1 = document.createElement('div');
  row1.className = 'all-booking-block-row1';
  row1.appendChild(timeEl);
  if (opts.priceFn) {
    var totalPrice = opts.priceFn(block);
    if (totalPrice) {
      var priceEl = document.createElement('span');
      priceEl.className = 'all-booking-block-total';
      priceEl.textContent = totalPrice;
      row1.appendChild(priceEl);
    }
  }
  row1.appendChild(chevron);
  header.appendChild(row1);

  /* Row 2: name + action buttons */
  var row2 = document.createElement('div');
  row2.className = 'all-booking-block-row2';
  row2.appendChild(nameEl);

  if (isFullyConfirmed) {
    var badge = document.createElement('span');
    badge.className = 'badge badge-confirmed';
    badge.textContent = '\u2713 Bestätigt';
    row2.appendChild(badge);
    if (isFullyConfirmed && !isPast && opts.onReleaseBlock) {
      var releaseBtn = document.createElement('button');
      releaseBtn.className = 'btn btn-secondary btn-sm all-booking-release-btn';
      releaseBtn.textContent = '\u21a9 Freigeben';
      (function(b) { releaseBtn.addEventListener('click', function(e) { e.stopPropagation(); opts.onReleaseBlock(b); }); })(block);
      row2.appendChild(releaseBtn);
    }
  } else if (opts.onConfirmBlock) {
    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-ghost btn-sm all-booking-confirm-btn';
    confirmBtn.textContent = '\u2713 Bestätigen';
    (function(b) { confirmBtn.addEventListener('click', function(e) { e.stopPropagation(); opts.onConfirmBlock(b); }); })(block);
    row2.appendChild(confirmBtn);
  }

  if (!isPast && !isFullyConfirmed && opts.onEditBlock) {
    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-sm all-booking-move-all-btn';
    editBtn.setAttribute('aria-label', 'Block bearbeiten');
    editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H2v-3L11.5 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    (function(b) { editBtn.addEventListener('click', function(e) { e.stopPropagation(); opts.onEditBlock(b); }); })(block);
    row2.appendChild(editBtn);
  }

  header.appendChild(row2);

  var detail = document.createElement('div');
  detail.className = 'all-booking-block-detail' + (isOpen ? ' is-open' : '');
  if (isOpen) opts.populateDetail(detail, block);

  function toggle() {
    if (expandedBlocks[blockKey]) {
      /* Clicking open block → close it */
      delete expandedBlocks[blockKey];
      chevron.classList.remove('is-open');
      detail.classList.remove('is-open');
      detail.innerHTML = '';
    } else {
      /* Close all other open blocks in the same container */
      var container = wrapper.parentNode;
      if (container) {
        var siblings = container.querySelectorAll('.all-booking-block-detail.is-open');
        for (var si = 0; si < siblings.length; si++) {
          var sibDetail  = siblings[si];
          var sibWrapper = sibDetail.parentNode;
          if (sibWrapper && sibWrapper !== wrapper) {
            sibDetail.classList.remove('is-open');
            sibDetail.innerHTML = '';
            var sibChevron = sibWrapper.querySelector('.all-booking-chevron');
            if (sibChevron) sibChevron.classList.remove('is-open');
          }
        }
        /* Clear expandedBlocks for all keys belonging to this container's role */
        Object.keys(expandedBlocks).forEach(function(k) { delete expandedBlocks[k]; });
      }
      expandedBlocks[blockKey] = true;
      chevron.classList.add('is-open');
      detail.classList.add('is-open');
      opts.populateDetail(detail, block);
      if (opts.onExpand) opts.onExpand();
    }
  }
  header.addEventListener('click', toggle);
  header.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') toggle(); });

  wrapper.appendChild(header);
  wrapper.appendChild(detail);
  return wrapper;
}
/* ── filterListBySearch — shared search utility ─────────────────────────────
 * mockup-searchInput-2026-03-23_20-16
 * items    : array of any objects
 * query    : string — the search term (trimmed, case-insensitive)
 * getLabel : function(item) → string — returns the searchable text for each item
 * returns  : filtered array (original order preserved)
 * ─────────────────────────────────────────────────────────────────────────── */
function filterListBySearch(items, query, getLabel) {
  var q = (query || '').trim().toLowerCase();
  if (!q) return items;
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var label = (getLabel(items[i]) || '').toLowerCase();
    if (label.indexOf(q) !== -1) result.push(items[i]);
  }
  return result;
}
window.filterListBySearch = filterListBySearch;

/* ── buildSearchInput — renders the search field HTML string ─────────────────
 * id       : string — unique id for the <input> element (e.g. 'bk-search')
 * placeholder : string — e.g. 'Schüler suchen…'
 * returns  : HTML string for .search-input-wrap
 * ─────────────────────────────────────────────────────────────────────────── */
function buildSearchInput(id, placeholder) {
  return '<div class="search-input-wrap" id="' + id + '-wrap">' +
    '<span class="search-icon">' +
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
        '<circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>' +
    '</span>' +
    '<input type="text" id="' + id + '" class="search-input" placeholder="' + _esc(placeholder) + '" autocomplete="off">' +
    '<button class="search-input-clear" id="' + id + '-clear" aria-label="Suche leeren">&#x2715;</button>' +
  '</div>';
}
window.buildSearchInput = buildSearchInput;

/* ── wireSearchInput — binds input + clear button, calls onSearch(query) ─────
 * id       : string — same id passed to buildSearchInput
 * onSearch : function(query) — called on every keystroke and on clear
 * ─────────────────────────────────────────────────────────────────────────── */
function wireSearchInput(id, onSearch) {
  var input   = document.getElementById(id);
  var wrap    = document.getElementById(id + '-wrap');
  var clearBtn = document.getElementById(id + '-clear');
  if (!input || !wrap || !clearBtn) return;

  input.addEventListener('input', function() {
    var q = input.value;
    wrap.classList.toggle('has-value', q.length > 0);
    onSearch(q);
  });
  clearBtn.addEventListener('click', function() {
    input.value = '';
    wrap.classList.remove('has-value');
    input.focus();
    onSearch('');
  });
}
window.wireSearchInput = wireSearchInput;

window.buildBookingBlock = buildBookingBlock;

/**
 * populateBookingDetail — shared detail renderer.
 *
 * opts.pendingMap   — pendingBookings (teacher) | pendingDayChanges (student)
 * opts.getSlots     — function(block) → array of all day slots
 * opts.showFreeSlots — bool — whether to show free slots (teacher free-accordion: true; student block detail: context-dependent)
 * opts.onAction     — function() called after any state mutation (re-render hook)
 * opts.onConfirmSlot — function(slotId) opens per-slot confirm dialog
 * opts.onAddSlot    — function(slot) | null — if null, + Add button not shown
 * opts.stuId        — uid to filter booked slots (null = show all booked)
 */
function populateBookingDetail(detail, block, opts) {
  detail.innerHTML = '';
  var pendingMap   = opts.pendingMap;
  var today        = block.today || fmtDate(new Date());
  var stuId        = opts.stuId !== undefined ? opts.stuId : null;
  var showFree     = opts.showFreeSlots !== false;

  var allDateSlots = opts.getSlots(block)
    .sort(function(a, b) { return a.time.localeCompare(b.time); });

  var seenIds = {};
  var display = allDateSlots.filter(function(s) {
    if (seenIds[s.slotId]) return false;
    var include = false;
    if (s.status === 'booked' && (stuId === null || s.studentId === stuId)) include = true;
    if (showFree && (s.status === 'available' || s.status === 'recurring') && !s.studentId) include = true;
    if (pendingMap[s.slotId]) include = true;
    if (include) seenIds[s.slotId] = true;
    return include;
  });

  if (!display.length) {
    var empty = document.createElement('p');
    empty.className = 'text-muted';
    empty.style.padding = 'var(--sp-3)';
    empty.textContent = 'Keine Slots an diesem Tag.';
    detail.appendChild(empty);
    return;
  }

  for (var i = 0; i < display.length; i++) {
    var origSlot  = display[i];
    var isPending = !!pendingMap[origSlot.slotId];
    var pendingObj = pendingMap[origSlot.slotId];
    var isBooked  = (origSlot.status === 'booked' && (stuId === null || origSlot.studentId === stuId))
                  || (isPending && pendingObj.action === 'book');
    var isSlotPast   = origSlot.date < today;
    var isConfirmed  = !!origSlot.confirmedAt;

    var row = document.createElement('div');
    row.className = 'all-booking-slot-row'
      + (isBooked ? '' : ' all-booking-slot-available')
      + (isPending ? ' slot-pending' : '');

    var timeEl = document.createElement('span');
    timeEl.className = 'all-booking-slot-time';
    var _srvUid = typeof Auth !== 'undefined' && Auth.current() ? Auth.current().uid : null;
    timeEl.textContent = _tViewerTime(origSlot.time, origSlot.date, _srvUid) + ' – ' + _tViewerEndTime(origSlot.time, origSlot.date, _srvUid);

    var statusEl = document.createElement('span');
    statusEl.className = 'all-booking-slot-status';
    /* "Gebucht" is redundant — price shows instead. "Storniert" goes on its own line below. */
    statusEl.textContent = '';

    var btnGroup = document.createElement('div');
    btnGroup.className = 'all-booking-slot-btns';

    if (isBooked) {
      if (isConfirmed) {
        var cBadge = document.createElement('span');
        cBadge.className = 'badge badge-confirmed';
        cBadge.textContent = '\u2713 Bestätigt';
        btnGroup.appendChild(cBadge);
      } else {
        if (opts.onConfirmSlot) {
          var confirmSlotBtn = document.createElement('button');
          confirmSlotBtn.className = 'btn btn-ghost btn-sm';
          confirmSlotBtn.textContent = '\u2713';
          confirmSlotBtn.title = 'Bestätigen';
          (function(s) {
            confirmSlotBtn.addEventListener('click', function(e) { e.stopPropagation(); opts.onConfirmSlot(s.slotId); });
          })(origSlot);
          btnGroup.appendChild(confirmSlotBtn);
        }
        if (!isSlotPast) {
          var cancelBtn = document.createElement('button');
          cancelBtn.className = (isPending && pendingObj.action === 'cancel') ? 'btn btn-ghost btn-sm' : 'btn btn-danger btn-sm';
          cancelBtn.textContent = (isPending && pendingObj.action === 'cancel') ? 'Undo' : 'Cancel';
          (function(s) {
            cancelBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              if (pendingMap[s.slotId] && pendingMap[s.slotId].action === 'cancel') {
                delete pendingMap[s.slotId];
                if (opts.onAction) opts.onAction();
              } else if (pendingMap[s.slotId] && pendingMap[s.slotId].action === 'book') {
                /* Dismiss ALL staged bookings if caller provides onDismissAll */
                if (opts.onDismissAll) {
                  opts.onDismissAll();
                } else {
                  delete pendingMap[s.slotId];
                  if (opts.onAction) opts.onAction();
                }
              } else if (opts.onCancelSlot) {
                /* Caller handles policy dialog — e.g. student shows cost warning */
                opts.onCancelSlot(s, pendingMap, opts.onAction);
              } else {
                var original = AppService.getAllSlotsSync().filter(function(x) { return x.slotId === s.slotId; })[0];
                pendingMap[s.slotId] = { action: 'cancel', originalSlot: original, newStudentId: null };
                if (opts.onAction) opts.onAction();
              }
            });
          })(origSlot);
          btnGroup.appendChild(cancelBtn);
        }
      }
    } else if (showFree && opts.onAddSlot && !block.isFullyConfirmed && !isSlotPast) {
      /* Check student's booking permission — only relevant when teacher is booking */
      var stuUid   = opts.stuId || null;
      var actorIsTeacher = (opts.actorRole === 'teacher');
      var perm     = (stuUid && actorIsTeacher && typeof ProfileStore !== 'undefined')
        ? ProfileStore.getBookingPermission(stuUid) : 'always';

      if (perm === 'never') {
        /* Teacher may never book for this student */
        var disabledBtn = document.createElement('button');
        disabledBtn.className = 'btn btn-ghost btn-sm';
        disabledBtn.disabled = true;
        disabledBtn.title = 'Dieser Schüler möchte nur selbst Buchungen vornehmen';
        disabledBtn.textContent = '⊘';
        btnGroup.appendChild(disabledBtn);
      } else {
        var addBtn = document.createElement('button');
        if (perm === 'on_request') {
          addBtn.className = isPending ? 'btn btn-ghost btn-sm' : 'btn btn-secondary btn-sm';
          addBtn.textContent = isPending ? 'Undo' : '? Anfragen';
        } else {
          addBtn.className = isPending ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm';
          addBtn.textContent = isPending ? 'Undo' : '+ Add';
        }
        (function(s, permission) {
          addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (pendingMap[s.slotId]) {
              delete pendingMap[s.slotId];
            } else if (permission === 'on_request') {
              opts.onRequestSlot(s, pendingMap);
            } else {
              opts.onAddSlot(s, pendingMap);
            }
            if (opts.onAction) opts.onAction();
          });
        })(origSlot, perm);
        btnGroup.appendChild(addBtn);
      }
    }

    row.appendChild(timeEl);
    row.appendChild(statusEl);
    if (isBooked && opts.slotPriceFn) {
      var slotPrice = opts.slotPriceFn(origSlot);
      if (slotPrice) {
        var slotPriceEl = document.createElement('span');
        slotPriceEl.className = 'all-booking-slot-price';
        slotPriceEl.textContent = slotPrice;
        row.appendChild(slotPriceEl);
      }
    }
    row.appendChild(btnGroup);
    detail.appendChild(row);

    /* Pending status label — own line below the row, clear of the amber border */
    if (isPending && pendingObj) {
      var statusLine = document.createElement('div');
      statusLine.className = 'all-booking-slot-pending-label';
      statusLine.textContent = pendingObj.action === 'cancel' ? '\u2715 Wird storniert' : '\u2713 Wird gebucht';
      statusLine.classList.add(pendingObj.action === 'cancel' ? 'pending-label-cancel' : 'pending-label-book');
      detail.appendChild(statusLine);
    }
  }
}
window.populateBookingDetail = populateBookingDetail;

/* ══════════════════════════════════════════════════════════
   SHARED BOOKING BADGE / COUNT FUNCTIONS
══════════════════════════════════════════════════════════ */

/**
 * _calcBookingBlockCounts — shared block counter.
 * opts.mergeFn — function(dateStr, slots, today) → blocks array
 */
function _calcBookingBlockCounts(slots, today, opts) {
  var mergeFn    = opts.mergeFn;
  var priceFn    = opts.priceFn || null; /* optional: function(slot) → number */
  var byDate = {};
  for (var i = 0; i < slots.length; i++) {
    var d = slots[i].date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(slots[i]);
  }
  function calcGroup(blockFilterFn) {
    var count = 0;
    var total = 0;
    var dates = Object.keys(byDate);
    for (var di = 0; di < dates.length; di++) {
      var blocks = mergeFn(dates[di], byDate[dates[di]], today);
      blocks.filter(blockFilterFn).forEach(function(b) {
        count++;
        if (priceFn) {
          b.bookedSlots.forEach(function(s) { total += priceFn(s); });
        }
      });
    }
    return { count: count, total: total };
  }
  var g = {
    all:         calcGroup(function()  { return true; }),
    unconfirmed: calcGroup(function(b) { return !b.isFullyConfirmed; }),
    confirmed:   calcGroup(function(b) { return !!b.isFullyConfirmed; })
  };
  return {
    all:              g.all.count,
    unconfirmed:      g.unconfirmed.count,
    confirmed:        g.confirmed.count,
    totalAll:         g.all.total,
    totalUnconfirmed: g.unconfirmed.total,
    totalConfirmed:   g.confirmed.total
  };
}
window._calcBookingBlockCounts = _calcBookingBlockCounts;

/**
 * _updateBookingBadges — shared badge updater.
 * opts.getSlots      — function() → raw booked slot array
 * opts.partyField    — 'studentId' | 'teacherId' (for party filter)
 * opts.mergeFn       — passed to _calcBookingBlockCounts
 * opts.priceFn       — function(slot) → number (locked price per slot)
 * opts.badgePrefix   — '' (teacher) | 'mb-' (student)
 * opts.containerId   — container to scope querySelector, or null for global
 */
function _updateBookingBadges(opts) {
  var today      = fmtDate(new Date());
  var slots      = opts.getSlots();
  var partyField = opts.partyField;

  if (bookingsFilter.student !== 'all') {
    slots = slots.filter(function(s) { return s[partyField] === bookingsFilter.student; });
  }
  slots = _applyTimeFilter(slots, bookingsFilter.time, today);
  slots = _applyDateRangeFilter(slots);

  var counts = _calcBookingBlockCounts(slots, today, {
    mergeFn: opts.mergeFn,
    priceFn: opts.priceFn || null
  });

  var prefix    = opts.badgePrefix || '';
  var container = opts.containerId ? document.getElementById(opts.containerId) : null;

  function setBadge(id, count) {
    var el = container ? container.querySelector('#' + id) : document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.classList.remove('is-hidden');
  }
  function setPriceBadge(id, total) {
    var el = container ? container.querySelector('#' + id) : document.getElementById(id);
    if (!el) return;
    el.textContent = total > 0 ? _fmtForUser(total, _getActorUid()) : '';
    el.classList.toggle('is-hidden', total === 0);
  }

  setBadge(prefix + 'all-count-badge',         counts.all);
  setBadge(prefix + 'unconfirmed-count-badge', counts.unconfirmed);
  setBadge(prefix + 'confirmed-count-badge',   counts.confirmed);
  setPriceBadge(prefix + 'all-price-badge',         counts.totalAll);
  setPriceBadge(prefix + 'unconfirmed-price-badge', counts.totalUnconfirmed);
  setPriceBadge(prefix + 'confirmed-price-badge',   counts.totalConfirmed);
}
window._updateBookingBadges = _updateBookingBadges;

/* ── ES5 .closest() Polyfill ────────────────────────────────
   Alle Consumer-Seiten laden ui.js — daher ist _closest()
   global verfügbar für skiing-catalog.js, catalog-filter-drawer.js etc.
   Traversiert den DOM nach oben bis ein Element mit der CSS-Klasse
   oder dem Selektor gefunden wird.                           */
function _closest(el, selector) {
  if (!el || !selector) return null;
  /* Einfacher Klassen-Check (.className) */
  if (selector.charAt(0) === '.') {
    var cls = selector.slice(1);
    var node = el;
    while (node && node !== document) {
      if (node.classList && node.classList.contains(cls)) return node;
      node = node.parentNode;
    }
    return null;
  }
  /* Attribut-Selektor [attr] */
  if (selector.charAt(0) === '[') {
    var attr = selector.slice(1, selector.length - 1).split('=')[0];
    var node = el;
    while (node && node !== document) {
      if (node.hasAttribute && node.hasAttribute(attr)) return node;
      node = node.parentNode;
    }
    return null;
  }
  /* ID-Selektor (#id) */
  if (selector.charAt(0) === '#') {
    var id = selector.slice(1);
    var node = el;
    while (node && node !== document) {
      if (node.id === id) return node;
      node = node.parentNode;
    }
    return null;
  }
  /* Tag-Name */
  var tag = selector.toUpperCase();
  var node = el;
  while (node && node !== document) {
    if (node.tagName === tag) return node;
    node = node.parentNode;
  }
  return null;
}
window._closest = _closest;
