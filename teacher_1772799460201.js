/**
 * teacher.js — Teacher View Logic
 */

var currentUser  = null;
var viewYear     = 0;
var viewMonth    = 0;
var selectedDate = null;

var TODAY = new Date();
TODAY.setHours(0,0,0,0);

var MONTH_NAMES = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];

document.addEventListener('DOMContentLoaded', function() {
  currentUser = Auth.require('teacher');
  if (!currentUser) return;

  document.getElementById('topbar-name').textContent = currentUser.name;

  var now = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('logout-btn').addEventListener('click', function() { Auth.logout(); });
  document.getElementById('prev-btn').addEventListener('click', prevMonth);
  document.getElementById('next-btn').addEventListener('click', nextMonth);

  renderStudentList();
  renderCalendar();
  renderDayPanel();
});

/* ── Student List ─────────────────────────────────────── */
function renderStudentList() {
  var selections = Store.Selections.byTeacher(currentUser.uid);
  var container  = document.getElementById('student-list');

  document.getElementById('stat-students').textContent = selections.length;

  if (!selections.length) {
    container.innerHTML = '<p class="text-muted" style="padding:var(--sp-2) 0">No students yet.</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < selections.length; i++) {
    var student = Store.Users.byUid(selections[i].studentId);
    if (!student) continue;
    var lessons = Store.Bookings.byStudent(student.uid)
      .filter(function(b) { return b.teacherId === currentUser.uid; }).length;
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--neutral-100);">'
      + '<div>'
      + '<div style="font-weight:var(--weight-semibold);color:var(--neutral-900);font-size:var(--text-caption)">' + student.name + '</div>'
      + '<div style="font-size:var(--text-caption);color:var(--neutral-500)">' + lessons + ' booking' + (lessons !== 1 ? 's' : '') + '</div>'
      + '</div>'
      + '<code style="font-size:var(--text-caption);background:var(--neutral-100);padding:2px 6px;border-radius:3px;color:var(--neutral-600)">' + student.uid + '</code>'
      + '</div>';
  }
  container.innerHTML = html;
}

/* ── Calendar ─────────────────────────────────────────── */
function renderCalendar() {
  document.getElementById('month-label').textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;

  var grid = document.getElementById('cal-days');
  grid.innerHTML = '';

  var first    = new Date(viewYear, viewMonth, 1);
  var startDow = first.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  var prevDays    = new Date(viewYear, viewMonth, 0).getDate();

  for (var i = startDow - 1; i >= 0; i--) {
    grid.appendChild(makeCell(prevDays - i, true));
  }

  for (var d = 1; d <= daysInMonth; d++) {
    (function(day) {
      var date      = new Date(viewYear, viewMonth, day);
      var isToday   = date.getTime() === TODAY.getTime();
      var isSel     = selectedDate && date.getTime() === selectedDate.getTime();
      var dateStr   = fmtDate(date);
      var slots     = getSlotsForDate(dateStr);
      var hasAny    = slots.length > 0;
      var hasBooked = slots.some(function(s) { return s.status === 'booked'; });

      var cell = makeCell(day, false, isToday, isSel, hasAny, hasBooked);
      cell.addEventListener('click', function() { selectDate(date); });
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') selectDate(date);
      });
      grid.appendChild(cell);
    })(d);
  }

  var total    = startDow + daysInMonth;
  var trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (var t = 1; t <= trailing; t++) {
    grid.appendChild(makeCell(t, true));
  }

  updateStats();
}

function makeCell(num, otherMonth, isToday, isSelected, hasSlots, hasBooked) {
  var el = document.createElement('div');
  el.className = 'cal-day';
  el.textContent = num;
  if (otherMonth) el.classList.add('other-month');
  if (isToday)    el.classList.add('today');
  if (isSelected) el.classList.add('selected');
  if (hasSlots)   el.classList.add('has-slots');
  if (hasBooked)  el.classList.add('has-booked');
  return el;
}

function selectDate(date) {
  selectedDate = date;
  renderCalendar();
  renderDayPanel();
}

function prevMonth() {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
}
function nextMonth() {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
}

/* ── Day Panel ────────────────────────────────────────── */
function renderDayPanel() {
  var panel = document.getElementById('day-panel');

  if (!selectedDate) {
    panel.innerHTML = '<p class="text-muted" style="text-align:center;padding:var(--sp-6) 0">Select a day to manage slots.</p>';
    return;
  }

  var dateStr = fmtDate(selectedDate);
  var slots   = getSlotsForDate(dateStr);
  var label   = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);gap:var(--sp-2)">'
    + '<div style="font-weight:var(--weight-semibold);color:var(--neutral-900);font-size:var(--text-caption)">' + label + '</div>'
    + '<button class="btn btn-primary btn-sm" id="add-slot-btn">'
    + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    + 'Add slot</button></div>';

  if (!slots.length) {
    html += '<p class="text-muted" style="text-align:center;padding:var(--sp-4) 0">No slots for this day.</p>';
  } else {
    for (var i = 0; i < slots.length; i++) {
      html += slotCard(slots[i]);
    }
  }

  panel.innerHTML = html;
  document.getElementById('add-slot-btn').addEventListener('click', openAddSlotModal);
}

function slotCard(slot) {
  var colors = {
    available: { bg: 'var(--color-50)',    border: 'var(--color-200)',   text: 'var(--color-700)' },
    blocked:   { bg: 'var(--neutral-100)', border: 'var(--neutral-300)', text: 'var(--neutral-600)' },
    timeout:   { bg: '#fef9ec',            border: '#f5d97e',            text: '#7a5c00' },
    booked:    { bg: 'var(--color-900)',   border: 'var(--color-900)',   text: 'var(--neutral-0)' }
  };
  var c = colors[slot.status] || colors.available;

  var studentInfo = '';
  if (slot.status === 'booked' && slot.studentId) {
    var student = Store.Users.byUid(slot.studentId);
    if (student) studentInfo = '<div style="font-size:var(--text-caption);margin-top:2px;opacity:0.8">' + student.name + ' (' + student.uid + ')</div>';
  }

  var actions = '';
  if (slot.status !== 'booked') {
    actions += '<button class="btn btn-sm" style="background:transparent;border:1px solid ' + c.border + ';color:' + c.text + ';padding:2px var(--sp-2)" onclick="cycleStatus(\'' + slot.bookingId + '\')">Change</button>';
  }
  actions += '<button class="btn btn-sm" style="background:transparent;border:1px solid ' + c.border + ';color:' + c.text + ';padding:2px 6px" onclick="deleteSlot(\'' + slot.bookingId + '\')">'
    + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '</button>';

  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) var(--sp-3);border:1px solid ' + c.border + ';border-radius:var(--radius-sm);background:' + c.bg + ';margin-bottom:var(--sp-2);gap:var(--sp-3);">'
    + '<div>'
    + '<div style="font-weight:var(--weight-semibold);color:' + c.text + ';font-size:var(--text-caption)">' + slot.start + ' – ' + slot.end + '</div>'
    + '<div style="font-size:var(--text-caption);color:' + c.text + ';opacity:0.7;text-transform:uppercase;letter-spacing:0.04em">' + slot.status + '</div>'
    + studentInfo
    + '</div>'
    + '<div style="display:flex;gap:var(--sp-1)">' + actions + '</div>'
    + '</div>';
}

/* ── Add Slot Modal ───────────────────────────────────── */
function openAddSlotModal() {
  if (!selectedDate) return;
  var dateStr = fmtDate(selectedDate);
  var label   = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  var result = Modal.show({
    title: 'Add slot — ' + label,
    bodyHTML:
      '<div class="form-group">'
        + '<label class="form-label" for="slot-start">Start time</label>'
        + '<input class="form-input" type="time" id="slot-start" value="09:00" />'
        + '<span class="form-error-msg" id="e-slot-start" style="display:none"></span>'
      + '</div>'
      + '<div class="form-group">'
        + '<label class="form-label" for="slot-end">End time</label>'
        + '<input class="form-input" type="time" id="slot-end" value="09:30" />'
        + '<span class="form-error-msg" id="e-slot-end" style="display:none"></span>'
      + '</div>'
      + '<div class="form-group">'
        + '<label class="form-label" for="slot-status">Status</label>'
        + '<select class="form-select" id="slot-status">'
          + '<option value="available">Available</option>'
          + '<option value="blocked">Blocked</option>'
          + '<option value="timeout">Timeout</option>'
        + '</select>'
      + '</div>',
    footerHTML:
      '<button class="btn btn-ghost" id="modal-cancel">Cancel</button>'
      + '<button class="btn btn-primary" id="modal-confirm">Add slot</button>'
  });

  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    var start  = document.getElementById('slot-start').value;
    var end    = document.getElementById('slot-end').value;
    var status = document.getElementById('slot-status').value;
    var eStart = document.getElementById('e-slot-start');
    var eEnd   = document.getElementById('e-slot-end');

    eStart.style.display = 'none';
    eEnd.style.display   = 'none';

    var valid = true;
    if (!start) { eStart.textContent = 'Required.'; eStart.style.display = 'block'; valid = false; }
    if (!end)   { eEnd.textContent   = 'Required.'; eEnd.style.display   = 'block'; valid = false; }
    if (valid && end <= start) { eEnd.textContent = 'End must be after start.'; eEnd.style.display = 'block'; valid = false; }
    if (!valid) return;

    Store.Bookings.create({
      teacherId: currentUser.uid,
      studentId: null,
      date: dateStr,
      start: start,
      end: end,
      status: status
    });

    Toast.success('Slot ' + start + '–' + end + ' added.');
    result.close();
    renderCalendar();
    renderDayPanel();
  });
}

/* ── Slot Actions ─────────────────────────────────────── */
var STATUS_CYCLE = ['available', 'blocked', 'timeout'];

function cycleStatus(bookingId) {
  var all  = Store.Bookings.all();
  var slot = null;
  for (var i = 0; i < all.length; i++) {
    if (all[i].bookingId === bookingId) { slot = all[i]; break; }
  }
  if (!slot || slot.status === 'booked') return;
  var idx  = STATUS_CYCLE.indexOf(slot.status);
  var next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  Store.Bookings.update(bookingId, { status: next });
  renderDayPanel();
  renderCalendar();
}

function deleteSlot(bookingId) {
  Store.Bookings.delete(bookingId);
  Toast.success('Slot removed.');
  renderDayPanel();
  renderCalendar();
}

/* ── Stats ────────────────────────────────────────────── */
function updateStats() {
  var allSlots  = Store.Bookings.byTeacher(currentUser.uid);
  var booked    = allSlots.filter(function(s) { return s.status === 'booked'; }).length;
  var available = allSlots.filter(function(s) { return s.status === 'available'; }).length;
  document.getElementById('stat-booked').textContent    = booked;
  document.getElementById('stat-available').textContent = available;
}

/* ── Helpers ──────────────────────────────────────────── */
function getSlotsForDate(dateStr) {
  return Store.Bookings.byTeacher(currentUser.uid)
    .filter(function(b) { return b.date === dateStr; })
    .sort(function(a, b) { return a.start.localeCompare(b.start); });
}

function fmtDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
