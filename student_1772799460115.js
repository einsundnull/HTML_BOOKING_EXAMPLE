/**
 * student.js — Student View Logic
 */

var currentUser     = null;
var activeView      = 'catalog';
var activeTeacherId = null;
var viewYear        = 0;
var viewMonth       = 0;
var selectedDate    = null;

var TODAY = new Date();
TODAY.setHours(0,0,0,0);

var MONTH_NAMES = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];

document.addEventListener('DOMContentLoaded', function() {
  currentUser = Auth.require('student');
  if (!currentUser) return;

  document.getElementById('topbar-name').textContent = currentUser.name;

  var now = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('logout-btn').addEventListener('click', function() { Auth.logout(); });
  document.getElementById('nav-catalog').addEventListener('click', function() { switchView('catalog'); });
  document.getElementById('nav-calendar').addEventListener('click', function() { switchView('calendar'); });

  renderStats();
  switchView('catalog');
});

/* ── View Switcher ────────────────────────────────────── */
function switchView(view) {
  activeView = view;
  document.getElementById('nav-catalog').classList.toggle('active', view === 'catalog');
  document.getElementById('nav-calendar').classList.toggle('active', view === 'calendar');
  document.getElementById('view-catalog').style.display  = view === 'catalog'  ? '' : 'none';
  document.getElementById('view-calendar').style.display = view === 'calendar' ? '' : 'none';

  if (view === 'catalog')  renderCatalog();
  if (view === 'calendar') renderTeacherPicker();
}

/* ── Stats ────────────────────────────────────────────── */
function renderStats() {
  var selections = Store.Selections.byStudent(currentUser.uid);
  var bookings   = Store.Bookings.byStudent(currentUser.uid).filter(function(b) { return b.status === 'booked'; });
  document.getElementById('stat-teachers').textContent = selections.length;
  document.getElementById('stat-bookings').textContent = bookings.length;
}

/* ── Catalog ──────────────────────────────────────────── */
function renderCatalog() {
  var allTeachers  = Store.Users.byRole('teacher');
  var mySelections = Store.Selections.byStudent(currentUser.uid).map(function(s) { return s.teacherId; });
  var container    = document.getElementById('catalog-grid');

  if (!allTeachers.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:var(--sp-7);color:var(--neutral-500);font-size:var(--text-caption)">No teachers available yet.</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < allTeachers.length; i++) {
    var teacher    = allTeachers[i];
    var isSelected = mySelections.indexOf(teacher.uid) !== -1;
    var availCount = Store.Bookings.byTeacher(teacher.uid)
      .filter(function(b) { return b.status === 'available'; }).length;

    html += '<div class="card teacher-card' + (isSelected ? ' teacher-card-selected' : '') + '">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-2);margin-bottom:var(--sp-3)">'
      + '<div>'
      + '<div style="font-weight:var(--weight-semibold);color:var(--neutral-900);margin-bottom:var(--sp-1)">' + teacher.name + '</div>'
      + '<code style="font-size:var(--text-caption);background:var(--neutral-100);padding:2px 6px;border-radius:3px;color:var(--neutral-600)">' + teacher.uid + '</code>'
      + '</div>'
      + (isSelected ? '<span style="font-size:var(--text-caption);font-weight:var(--weight-semibold);color:var(--color-600);background:var(--color-50);border:1px solid var(--color-200);padding:2px var(--sp-2);border-radius:var(--radius-sm)">Selected</span>' : '')
      + '</div>'
      + '<div style="font-size:var(--text-caption);color:var(--neutral-500);margin-bottom:var(--sp-3)">' + availCount + ' available slot' + (availCount !== 1 ? 's' : '') + '</div>'
      + '<div style="display:flex;gap:var(--sp-2)">';

    if (isSelected) {
      html += '<button class="btn btn-secondary btn-sm" onclick="openTeacherCalendar(\'' + teacher.uid + '\')">View calendar</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="deselectTeacher(\'' + teacher.uid + '\')">Remove</button>';
    } else {
      html += '<button class="btn btn-primary btn-sm" onclick="selectTeacher(\'' + teacher.uid + '\')">Select</button>';
    }

    html += '</div></div>';
  }
  container.innerHTML = html;
}

function selectTeacher(teacherId) {
  Store.Selections.create(currentUser.uid, teacherId);
  var teacher = Store.Users.byUid(teacherId);
  Toast.success(teacher.name + ' added to your teachers.');
  renderStats();
  renderCatalog();
}

function deselectTeacher(teacherId) {
  Store.Selections.delete(currentUser.uid, teacherId);
  var teacher = Store.Users.byUid(teacherId);
  Toast.success(teacher.name + ' removed.');
  renderStats();
  renderCatalog();
}

function openTeacherCalendar(teacherId) {
  activeTeacherId = teacherId;
  selectedDate    = null;
  switchView('calendar');
}

/* ── Teacher Picker ───────────────────────────────────── */
function renderTeacherPicker() {
  var myTeachers = Store.Selections.byStudent(currentUser.uid)
    .map(function(s) { return Store.Users.byUid(s.teacherId); })
    .filter(function(t) { return t !== null; });

  var picker = document.getElementById('teacher-picker');

  if (!myTeachers.length) {
    picker.innerHTML = '<p class="text-muted">No teachers selected yet. Go to the catalog first.</p>';
    document.getElementById('cal-section').style.display = 'none';
    return;
  }

  if (!activeTeacherId) activeTeacherId = myTeachers[0].uid;

  var options = myTeachers.map(function(t) {
    return '<option value="' + t.uid + '"' + (t.uid === activeTeacherId ? ' selected' : '') + '>' + t.name + '</option>';
  }).join('');

  picker.innerHTML = '<div class="form-group" style="max-width:280px">'
    + '<label class="form-label" for="teacher-select">Teacher</label>'
    + '<select class="form-select" id="teacher-select">' + options + '</select>'
    + '</div>';

  document.getElementById('teacher-select').addEventListener('change', function(e) {
    activeTeacherId = e.target.value;
    selectedDate    = null;
    renderCalendar();
    renderSlotPanel();
  });

  document.getElementById('cal-section').style.display = '';

  // Re-bind nav buttons each time (they may have been replaced)
  var prevBtn = document.getElementById('prev-btn');
  var nextBtn = document.getElementById('next-btn');
  // Clone to remove old listeners
  var newPrev = prevBtn.cloneNode(true);
  var newNext = nextBtn.cloneNode(true);
  prevBtn.parentNode.replaceChild(newPrev, prevBtn);
  nextBtn.parentNode.replaceChild(newNext, nextBtn);
  newPrev.addEventListener('click', prevMonth);
  newNext.addEventListener('click', nextMonth);

  renderCalendar();
  renderSlotPanel();
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
    grid.appendChild(makeDayCell(prevDays - i, true));
  }

  for (var d = 1; d <= daysInMonth; d++) {
    (function(day) {
      var date    = new Date(viewYear, viewMonth, day);
      var isPast  = date < TODAY;
      var isToday = date.getTime() === TODAY.getTime();
      var isSel   = selectedDate && date.getTime() === selectedDate.getTime();
      var dateStr = fmtDate(date);

      var teacherSlots = activeTeacherId
        ? Store.Bookings.byTeacher(activeTeacherId).filter(function(b) { return b.date === dateStr; })
        : [];
      var hasAvail  = teacherSlots.some(function(s) { return s.status === 'available'; });
      var hasMyBook = teacherSlots.some(function(s) { return s.studentId === currentUser.uid; });

      var cell = makeDayCell(day, false, isToday, isSel, hasAvail && !isPast, hasMyBook);
      if (!isPast) {
        cell.addEventListener('click', function() {
          selectedDate = date;
          renderCalendar();
          renderSlotPanel();
        });
        cell.setAttribute('tabindex', '0');
        cell.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            selectedDate = date;
            renderCalendar();
            renderSlotPanel();
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
  el.textContent = num;
  if (otherMonth) el.classList.add('other-month');
  if (isToday)    el.classList.add('today');
  if (isSelected) el.classList.add('selected');
  if (hasAvail)   el.classList.add('has-avail');
  if (hasMyBook)  el.classList.add('has-mybook');
  return el;
}

function prevMonth() {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
  renderSlotPanel();
}
function nextMonth() {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
  renderSlotPanel();
}

/* ── Slot Panel ───────────────────────────────────────── */
function renderSlotPanel() {
  var panel = document.getElementById('slot-panel');
  if (!selectedDate || !activeTeacherId) {
    panel.innerHTML = '<p class="text-muted" style="text-align:center;padding:var(--sp-6) 0">Select a day to see slots.</p>';
    return;
  }

  var dateStr      = fmtDate(selectedDate);
  var teacherSlots = Store.Bookings.byTeacher(activeTeacherId)
    .filter(function(b) { return b.date === dateStr; })
    .sort(function(a, b) { return a.start.localeCompare(b.start); });

  var label   = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  var teacher = Store.Users.byUid(activeTeacherId);

  var html = '<div style="font-weight:var(--weight-semibold);color:var(--neutral-900);font-size:var(--text-caption);margin-bottom:var(--sp-3)">'
    + label + (teacher ? ' · ' + teacher.name : '') + '</div>';

  if (!teacherSlots.length) {
    html += '<p class="text-muted" style="text-align:center;padding:var(--sp-4) 0">No slots on this day.</p>';
  } else {
    for (var i = 0; i < teacherSlots.length; i++) {
      var card = studentSlotCard(teacherSlots[i]);
      if (card) html += card;
    }
    if (html.indexOf('slot-row') === -1) {
      html += '<p class="text-muted" style="text-align:center;padding:var(--sp-4) 0">No bookable slots on this day.</p>';
    }
  }

  panel.innerHTML = html;
}

function studentSlotCard(slot) {
  var isMyBooking = slot.studentId === currentUser.uid && slot.status === 'booked';
  var isAvailable = slot.status === 'available';

  if (!isMyBooking && !isAvailable) return '';

  var bg = 'var(--neutral-0)';
  var border = 'var(--neutral-200)';
  var textColor = 'var(--neutral-700)';
  var statusLabel = 'Available';
  var actions = '';

  if (isMyBooking) {
    bg = 'var(--color-50)';
    border = 'var(--color-200)';
    textColor = 'var(--color-700)';
    statusLabel = 'Your booking';
    actions = '<button class="btn btn-sm btn-secondary" onclick="openMoveModal(\'' + slot.bookingId + '\')">Move</button>'
            + '<button class="btn btn-sm btn-danger" onclick="cancelBooking(\'' + slot.bookingId + '\')">Cancel</button>';
  } else {
    actions = '<button class="btn btn-sm btn-primary" onclick="bookSlot(\'' + slot.bookingId + '\')">Book</button>';
  }

  return '<div class="slot-row" style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) var(--sp-3);border:1px solid ' + border + ';border-radius:var(--radius-sm);background:' + bg + ';margin-bottom:var(--sp-2);gap:var(--sp-3);">'
    + '<div>'
    + '<div style="font-weight:var(--weight-semibold);color:' + textColor + ';font-size:var(--text-caption)">' + slot.start + ' – ' + slot.end + '</div>'
    + '<div style="font-size:var(--text-caption);color:var(--neutral-500)">' + statusLabel + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:var(--sp-2)">' + actions + '</div>'
    + '</div>';
}

/* ── Book ─────────────────────────────────────────────── */
function bookSlot(bookingId) {
  Store.Bookings.update(bookingId, { status: 'booked', studentId: currentUser.uid });
  Toast.success('Slot booked.');
  renderStats();
  renderCalendar();
  renderSlotPanel();
}

/* ── Cancel ───────────────────────────────────────────── */
function cancelBooking(bookingId) {
  var result = Modal.show({
    title: 'Cancel booking',
    bodyHTML: '<p style="color:var(--neutral-700)">Are you sure you want to cancel this booking?</p>',
    footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Keep it</button><button class="btn btn-danger" id="modal-confirm">Cancel booking</button>'
  });
  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    Store.Bookings.update(bookingId, { status: 'available', studentId: null });
    Toast.success('Booking cancelled.');
    renderStats();
    renderCalendar();
    renderSlotPanel();
    result.close();
  });
}

/* ── Move ─────────────────────────────────────────────── */
function openMoveModal(bookingId) {
  var all     = Store.Bookings.all();
  var current = null;
  for (var i = 0; i < all.length; i++) {
    if (all[i].bookingId === bookingId) { current = all[i]; break; }
  }
  if (!current) return;

  var available = Store.Bookings.byTeacher(activeTeacherId)
    .filter(function(b) { return b.status === 'available' && b.bookingId !== bookingId; })
    .sort(function(a, b) { return a.date.localeCompare(b.date) || a.start.localeCompare(b.start); });

  var options = available.length
    ? available.map(function(s) { return '<option value="' + s.bookingId + '">' + s.date + ' · ' + s.start + '–' + s.end + '</option>'; }).join('')
    : '<option disabled>No available slots</option>';

  var result = Modal.show({
    title: 'Move booking',
    bodyHTML:
      '<p style="font-size:var(--text-caption);color:var(--neutral-500)">Current: <strong>' + current.date + ' · ' + current.start + '–' + current.end + '</strong></p>'
      + '<div class="form-group">'
      + '<label class="form-label" for="move-target">New slot</label>'
      + '<select class="form-select" id="move-target"' + (!available.length ? ' disabled' : '') + '>' + options + '</select>'
      + '</div>',
    footerHTML:
      '<button class="btn btn-ghost" id="modal-cancel">Cancel</button>'
      + '<button class="btn btn-primary" id="modal-confirm"' + (!available.length ? ' disabled' : '') + '>Move</button>'
  });

  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    var targetId = document.getElementById('move-target').value;
    if (!targetId) return;
    Store.Bookings.update(bookingId, { status: 'available', studentId: null });
    Store.Bookings.update(targetId, { status: 'booked', studentId: currentUser.uid });
    Toast.success('Booking moved.');
    renderStats();
    renderCalendar();
    renderSlotPanel();
    result.close();
  });
}

/* ── Helpers ──────────────────────────────────────────── */
function fmtDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
