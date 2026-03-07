/* ══════════════════════════════════════════════════════════
   student.css — Student-specific styles
   Grid styles (slot-grid-table, gc-*, grid-topbar etc.)
   are inherited from teacher.css.
══════════════════════════════════════════════════════════ */

/* ── Layout helpers ─────────────────────────────────────── */
.view-hidden { display: none !important; }

.stats-row-student { grid-template-columns: 1fr 1fr; max-width: 400px; }

/* ── View nav tabs ──────────────────────────────────────── */
.view-nav        { display: flex; gap: 2px; border-bottom: 1px solid var(--neutral-200); margin-bottom: var(--sp-5); }
.view-nav-btn    { font-family: var(--font); font-size: var(--text-body); font-weight: var(--weight-semibold); padding: var(--sp-2) var(--sp-4); border: none; border-bottom: 2px solid transparent; background: transparent; color: var(--neutral-500); cursor: pointer; transition: color var(--transition), border-color var(--transition); margin-bottom: -1px; }
.view-nav-btn:hover  { color: var(--neutral-700); }
.view-nav-btn.active { color: var(--neutral-900); border-bottom-color: var(--color-400); }

/* ── Catalog grid ───────────────────────────────────────── */
.catalog-grid         { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--sp-4); }
.catalog-empty        { grid-column: 1 / -1; text-align: center; padding: var(--sp-7) 0; }

/* ── Teacher cards ──────────────────────────────────────── */
.teacher-card          { transition: border-color var(--transition); }
.teacher-card-selected { border-color: var(--color-300); }
.teacher-card-top      { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.teacher-card-name     { font-weight: var(--weight-semibold); color: var(--neutral-900); margin-bottom: var(--sp-1); }
.teacher-card-avail    { margin-bottom: var(--sp-3); }
.teacher-card-actions  { display: flex; gap: var(--sp-2); }
.teacher-selected-badge { font-size: var(--text-caption); font-weight: var(--weight-semibold); color: var(--color-600); background: var(--color-50); border: 1px solid var(--color-200); padding: 2px var(--sp-2); border-radius: var(--radius-sm); white-space: nowrap; }

/* ── Teacher picker in calendar view ───────────────────── */
.teacher-picker-wrap { display: flex; align-items: flex-end; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; }
.teacher-picker-wrap .form-label { margin-bottom: var(--sp-1); display: block; }
.teacher-picker-wrap .form-select { min-width: 200px; }

.cal-hint { margin-bottom: var(--sp-3); }

/* ── Grid legend swatch for "mine" ──────────────────────── */
.swatch-mine { background: var(--color-900); border-color: var(--color-900); }

/* ── Student grid cell — own booking (navy) ─────────────── */
.grid-cell.gc-mine              { background: var(--color-900); border-color: var(--color-900); cursor: pointer; }
.grid-cell.gc-mine:hover        { background: var(--color-700); border-color: var(--color-700); }

/* ── Month calendar (student) ───────────────────────────── */
.student-cal-layout     { display: grid; grid-template-columns: 280px 1fr; gap: var(--sp-4); align-items: start; }
@media (max-width: 700px) { .student-cal-layout { grid-template-columns: 1fr; } }

.cal-nav        { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-3); }
.cal-nav-label  { font-size: var(--text-body); font-weight: var(--weight-semibold); color: var(--neutral-900); }
.cal-btn        { width: 32px; height: 32px; border: 1px solid var(--neutral-200); border-radius: var(--radius-sm); background: var(--neutral-0); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--neutral-700); transition: background var(--transition), border-color var(--transition); }
.cal-btn:hover  { background: var(--neutral-100); border-color: var(--neutral-300); }
.cal-btn:focus-visible { outline: none; box-shadow: var(--focus-ring); }

.cal-weekdays   { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--sp-1); margin-bottom: var(--sp-2); }
.cal-weekday    { text-align: center; font-size: var(--text-caption); font-weight: var(--weight-semibold); color: var(--neutral-500); text-transform: uppercase; letter-spacing: .04em; }
.cal-days       { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--sp-1); }

.cal-day        { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); font-size: var(--text-caption); cursor: pointer; border: 1px solid transparent; transition: background var(--transition), border-color var(--transition); color: var(--neutral-700); position: relative; }
.cal-day:hover:not(.other-month) { background: var(--neutral-100); border-color: var(--neutral-200); }
.cal-day:focus-visible           { outline: none; box-shadow: var(--focus-ring); }
.cal-day.other-month             { color: var(--neutral-300); cursor: default; pointer-events: none; }
.cal-day.today                   { font-weight: var(--weight-semibold); color: var(--color-400); border-color: var(--color-400); }
.cal-day.selected                { background: var(--color-900); color: var(--neutral-0); border-color: var(--color-900); font-weight: var(--weight-semibold); }
.cal-day.has-avail::after        { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--color-400); }
.cal-day.has-mybook::after       { background: var(--color-700); }
.cal-day.selected::after         { background: var(--neutral-0) !important; }

.cal-legend      { display: flex; flex-direction: column; gap: var(--sp-1); margin-top: var(--sp-3); }
.cal-legend-item { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--text-caption); color: var(--neutral-500); }
.cal-legend-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cal-legend-dot-avail  { background: var(--color-400); }
.cal-legend-dot-booked { background: var(--color-700); }

/* ── Day slot list ──────────────────────────────────────── */
.day-slots-card    { }
.day-slots-heading { font-weight: var(--weight-semibold); color: var(--neutral-900); margin-bottom: var(--sp-3); font-size: var(--text-caption); }
.day-slots-empty   { text-align: center; padding: var(--sp-5) 0; }

.day-slot-list { display: flex; flex-direction: column; }
.day-slot-row  { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-2) 0; border-bottom: 1px solid var(--neutral-100); gap: var(--sp-3); }
.day-slot-row:last-child { border-bottom: none; }
.day-slot-row-mine { background: var(--color-50); padding-left: var(--sp-2); padding-right: var(--sp-2); border-radius: var(--radius-sm); margin: 0 calc(var(--sp-2) * -1); }

.day-slot-time { font-family: monospace; font-size: var(--text-caption); font-weight: var(--weight-semibold); color: var(--neutral-800); white-space: nowrap; flex: 1; }
/**
 * student.js — Student View
 *
 * Booking via week grid (same layout as teacher).
 * Cell states (student perspective):
 *   gc-available  — green,  clickable → book instantly
 *   gc-mine       — navy,   clickable → cancel
 *   gc-empty      — grey,   not clickable
 */

var currentUser     = null;
var activeView      = 'catalog';
var activeTeacherId = null;

var sgridWeekStart  = null;

var viewYear        = 0;
var viewMonth       = 0;
var selectedDate    = null;

var TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

var MONTH_NAMES = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];
var DAY_NAMES   = ['Mo','Tu','We','Th','Fr','Sa','Su'];

var GRID_START  = '06:00';
var GRID_END    = '22:00';

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
window.addEventListener('load', function() {
  currentUser = Auth.require('student');
  if (!currentUser) return;
  Navbar.init('catalog');

  document.getElementById('nav-catalog').addEventListener('click', function() { switchView('catalog'); });
  document.getElementById('nav-calendar').addEventListener('click', function() { switchView('calendar'); });
  document.getElementById('sgrid-close-btn').addEventListener('click', closeStudentGrid);
  document.getElementById('sgrid-prev-week').addEventListener('click', sgridPrevWeek);
  document.getElementById('sgrid-next-week').addEventListener('click', sgridNextWeek);

  var now   = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  renderStats();
  switchView('catalog');
});

/* ── View switcher ──────────────────────────────────────── */
function switchView(view) {
  activeView = view;
  document.getElementById('nav-catalog').classList.toggle('active', view === 'catalog');
  document.getElementById('nav-calendar').classList.toggle('active', view === 'calendar');
  document.getElementById('view-catalog').classList.toggle('view-hidden', view !== 'catalog');
  document.getElementById('view-calendar').classList.toggle('view-hidden', view !== 'calendar');
  if (view === 'catalog')  renderCatalog();
  if (view === 'calendar') renderTeacherPicker();
}

/* ── Stats ──────────────────────────────────────────────── */
function renderStats() {
  var selections = Store.Selections.byStudent(currentUser.uid);
  var bookings   = Store.Slots.byStudent(currentUser.uid).filter(function(s) { return s.status === 'booked'; });
  document.getElementById('stat-teachers').textContent = selections.length;
  document.getElementById('stat-bookings').textContent = bookings.length;
}

/* ══════════════════════════════════════════════════════════
   CATALOG
══════════════════════════════════════════════════════════ */
function renderCatalog() {
  var allTeachers  = Store.Users.byRole('teacher');
  var mySelections = Store.Selections.byStudent(currentUser.uid).map(function(s) { return s.teacherId; });
  var container    = document.getElementById('catalog-grid');
  container.innerHTML = '';

  if (!allTeachers.length) {
    var empty = document.createElement('div');
    empty.className = 'catalog-empty text-muted';
    empty.textContent = 'No teachers available yet.';
    container.appendChild(empty);
    return;
  }

  for (var i = 0; i < allTeachers.length; i++) {
    container.appendChild(buildTeacherCard(allTeachers[i], mySelections));
  }
}

function buildTeacherCard(teacher, mySelections) {
  var isSelected = mySelections.indexOf(teacher.uid) !== -1;
  var availCount = Store.Slots.byTeacher(teacher.uid).filter(function(s) { return s.status === 'available'; }).length;

  var card = document.createElement('div');
  card.className = 'card teacher-card' + (isSelected ? ' teacher-card-selected' : '');

  var top = document.createElement('div');
  top.className = 'teacher-card-top';

  var nameWrap = document.createElement('div');
  var name = document.createElement('div');
  name.className = 'teacher-card-name';
  name.textContent = teacher.name;
  var uid = document.createElement('code');
  uid.className = 'uid-badge';
  uid.textContent = teacher.uid;
  nameWrap.appendChild(name);
  nameWrap.appendChild(uid);
  top.appendChild(nameWrap);

  if (isSelected) {
    var badge = document.createElement('span');
    badge.className = 'teacher-selected-badge';
    badge.textContent = 'Selected';
    top.appendChild(badge);
  }

  var avail = document.createElement('div');
  avail.className = 'teacher-card-avail text-muted';
  avail.textContent = availCount + ' available slot' + (availCount !== 1 ? 's' : '');

  var actions = document.createElement('div');
  actions.className = 'teacher-card-actions';

  if (isSelected) {
    var viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-secondary btn-sm';
    viewBtn.textContent = 'Book lessons';
    (function(tid) { viewBtn.addEventListener('click', function() { openTeacherGrid(tid); }); })(teacher.uid);

    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-ghost btn-sm';
    removeBtn.textContent = 'Remove';
    (function(tid) { removeBtn.addEventListener('click', function() { deselectTeacher(tid); }); })(teacher.uid);

    actions.appendChild(viewBtn);
    actions.appendChild(removeBtn);
  } else {
    var selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-primary btn-sm';
    selectBtn.textContent = 'Select';
    (function(tid) { selectBtn.addEventListener('click', function() { selectTeacher(tid); }); })(teacher.uid);
    actions.appendChild(selectBtn);
  }

  card.appendChild(top);
  card.appendChild(avail);
  card.appendChild(actions);
  return card;
}

function selectTeacher(teacherId) {
  Store.Selections.create(currentUser.uid, teacherId);
  Toast.success(Store.Users.byUid(teacherId).name + ' added to your teachers.');
  renderStats();
  renderCatalog();
}

function deselectTeacher(teacherId) {
  Store.Selections.delete(currentUser.uid, teacherId);
  Toast.success(Store.Users.byUid(teacherId).name + ' removed.');
  renderStats();
  renderCatalog();
}

function openTeacherGrid(teacherId) {
  activeTeacherId = teacherId;
  selectedDate    = null;
  switchView('calendar');
}

/* ══════════════════════════════════════════════════════════
   TEACHER PICKER (calendar view top)
══════════════════════════════════════════════════════════ */
function renderTeacherPicker() {
  var myTeachers = Store.Selections.byStudent(currentUser.uid)
    .map(function(s) { return Store.Users.byUid(s.teacherId); })
    .filter(function(t) { return t !== null; });

  var picker = document.getElementById('teacher-picker');
  picker.innerHTML = '';

  if (!myTeachers.length) {
    var p = document.createElement('p');
    p.className = 'text-muted';
    p.textContent = 'No teachers selected yet. Go to the catalog first.';
    picker.appendChild(p);
    document.getElementById('cal-section').classList.add('view-hidden');
    return;
  }

  if (!activeTeacherId) activeTeacherId = myTeachers[0].uid;

  var wrap = document.createElement('div');
  wrap.className = 'teacher-picker-wrap';

  var label = document.createElement('label');
  label.className = 'form-label';
  label.setAttribute('for', 'teacher-select');
  label.textContent = 'Teacher';

  var select = document.createElement('select');
  select.className = 'form-select';
  select.id = 'teacher-select';

  for (var i = 0; i < myTeachers.length; i++) {
    var opt = document.createElement('option');
    opt.value = myTeachers[i].uid;
    opt.textContent = myTeachers[i].name;
    if (myTeachers[i].uid === activeTeacherId) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', function(e) {
    activeTeacherId = e.target.value;
  });

  var weekBtn = document.createElement('button');
  weekBtn.className = 'btn btn-secondary btn-sm';
  weekBtn.textContent = 'Week view';
  weekBtn.addEventListener('click', openStudentGrid);

  wrap.appendChild(label);
  wrap.appendChild(select);
  wrap.appendChild(weekBtn);
  picker.appendChild(wrap);

  document.getElementById('cal-section').classList.remove('view-hidden');

  // Re-bind prev/next each time picker renders
  var prevBtn = document.getElementById('prev-btn');
  var nextBtn = document.getElementById('next-btn');
  var newPrev = prevBtn.cloneNode(true);
  var newNext = nextBtn.cloneNode(true);
  prevBtn.parentNode.replaceChild(newPrev, prevBtn);
  nextBtn.parentNode.replaceChild(newNext, nextBtn);
  newPrev.addEventListener('click', prevMonth);
  newNext.addEventListener('click', nextMonth);

  renderCalendar();
  renderDaySlots();
}

/* ══════════════════════════════════════════════════════════
   STUDENT WEEK GRID OVERLAY
══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   MONTH CALENDAR
══════════════════════════════════════════════════════════ */
function renderCalendar() {
  var calSection = document.getElementById('cal-section');
  if (!calSection) return;

  document.getElementById('month-label').textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;
  var grid = document.getElementById('cal-days');
  grid.innerHTML = '';

  var first    = new Date(viewYear, viewMonth, 1);
  var startDow = first.getDay();
  startDow     = (startDow === 0) ? 6 : startDow - 1;
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
      var slots   = activeTeacherId ? Store.Slots.byTeacherDate(activeTeacherId, dateStr) : [];
      var hasAvail  = !isPast && slots.some(function(s) { return s.status === 'available' || s.status === 'recurring'; });
      var hasMyBook = slots.some(function(s) { return s.status === 'booked' && s.studentId === currentUser.uid; });

      var cell = makeDayCell(day, false, isToday, isSel, hasAvail, hasMyBook);
      if (!isPast) {
        cell.setAttribute('tabindex', '0');
        cell.addEventListener('click', function() { selectedDate = date; renderCalendar(); renderDaySlots(); });
        cell.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { selectedDate = date; renderCalendar(); renderDaySlots(); } });
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
  if (otherMonth) el.classList.add('other-month');
  if (isToday)    el.classList.add('today');
  if (isSelected) el.classList.add('selected');
  if (hasAvail)   el.classList.add('has-avail');
  if (hasMyBook)  el.classList.add('has-mybook');
  el.textContent = num;
  return el;
}

function prevMonth() {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
  renderDaySlots();
}
function nextMonth() {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
  renderDaySlots();
}

/* ══════════════════════════════════════════════════════════
   DAY SLOT LIST
══════════════════════════════════════════════════════════ */
function renderDaySlots() {
  var container = document.getElementById('day-slots');
  if (!container) return;
  container.innerHTML = '';

  if (!selectedDate || !activeTeacherId) return;

  var dateStr = fmtDate(selectedDate);
  var slots   = Store.Slots.byTeacherDate(activeTeacherId, dateStr);
  var label   = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  var card = document.createElement('div');
  card.className = 'card day-slots-card';

  var heading = document.createElement('div');
  heading.className = 'day-slots-heading';
  heading.textContent = label;
  card.appendChild(heading);

  // Filter visible slots
  var visible = slots.filter(function(s) {
    if (s.status === 'available' || s.status === 'recurring') return true;
    if (s.status === 'booked' && s.studentId === currentUser.uid) return true;
    return false;
  });

  if (!visible.length) {
    var empty = document.createElement('p');
    empty.className = 'text-muted day-slots-empty';
    empty.textContent = 'No available slots on this day.';
    card.appendChild(empty);
    container.appendChild(card);
    return;
  }

  var list = document.createElement('div');
  list.className = 'day-slot-list';

  for (var i = 0; i < visible.length; i++) {
    list.appendChild(buildDaySlotRow(visible[i]));
  }
  card.appendChild(list);
  container.appendChild(card);
}

function buildDaySlotRow(slot) {
  var isMine = slot.status === 'booked' && slot.studentId === currentUser.uid;
  var row = document.createElement('div');
  row.className = 'day-slot-row' + (isMine ? ' day-slot-row-mine' : '');

  var timeEl = document.createElement('span');
  timeEl.className = 'day-slot-time';
  timeEl.textContent = slot.time + ' – ' + Store.slotEndTime(slot.time);

  var btn = document.createElement('button');
  if (isMine) {
    btn.className = 'btn btn-danger btn-sm';
    btn.textContent = 'Cancel';
    (function(s) {
      btn.addEventListener('click', function() { cancelDaySlot(s.slotId, s.time); });
    })(slot);
  } else {
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Book';
    (function(s) {
      btn.addEventListener('click', function() { bookDaySlot(s.slotId); });
    })(slot);
  }

  row.appendChild(timeEl);
  row.appendChild(btn);
  return row;
}

function bookDaySlot(slotId) {
  Store.Slots.update(slotId, { status: 'booked', studentId: currentUser.uid });
  Toast.success('Slot booked.');
  renderStats();
  renderCalendar();
  renderDaySlots();
}

function cancelDaySlot(slotId, time) {
  var result = Modal.show({
    title: 'Cancel booking',
    bodyHTML: '<p>Cancel your booking at <strong>' + time + '</strong>?</p>',
    footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Keep it</button><button class="btn btn-danger" id="modal-confirm">Cancel booking</button>'
  });
  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    Store.Slots.update(slotId, { status: 'available', studentId: null });
    Toast.success('Booking cancelled.');
    renderStats();
    renderCalendar();
    renderDaySlots();
    result.close();
  });
}

function openStudentGrid() {
  if (!activeTeacherId) return;

  // Start on current week (Monday)
  if (!sgridWeekStart) {
    var monday = new Date(TODAY);
    var dow = monday.getDay();
    dow = (dow === 0) ? 6 : dow - 1;
    monday.setDate(monday.getDate() - dow);
    sgridWeekStart = monday;
  }

  var teacher = Store.Users.byUid(activeTeacherId);
  document.getElementById('sgrid-teacher-name').textContent = teacher ? teacher.name : '';

  document.getElementById('student-grid-overlay').classList.add('is-open');
  document.body.classList.add('overlay-open');

  renderStudentGrid();
}

function closeStudentGrid() {
  document.getElementById('student-grid-overlay').classList.remove('is-open');
  document.body.classList.remove('overlay-open');
  renderStats();
}

function sgridPrevWeek() {
  sgridWeekStart.setDate(sgridWeekStart.getDate() - 7);
  renderStudentGrid();
}

function sgridNextWeek() {
  sgridWeekStart.setDate(sgridWeekStart.getDate() + 7);
  renderStudentGrid();
}

/* ── Week grid render ───────────────────────────────────── */
function renderStudentGrid() {
  var weekDates = getSgridWeekDates();

  // Materialise recurring rules for this week so all days show correct slots
  if (activeTeacherId) {
    Store.Recurring.materialiseWeek(activeTeacherId, weekDates);
  }

  var times = Store.slotTimesInRange(GRID_START, GRID_END);

  // Update week label
  document.getElementById('sgrid-week-label').textContent = sgridWeekRangeLabel(weekDates);

  var container = document.getElementById('sgrid-content');
  container.innerHTML = '';

  var table = document.createElement('table');
  table.className = 'slot-grid-table';

  // ── thead ──
  var thead = document.createElement('thead');
  var hrow  = document.createElement('tr');

  var thTime = document.createElement('th');
  thTime.className = 'grid-th-time';
  thTime.textContent = 'Time';
  hrow.appendChild(thTime);

  for (var d = 0; d < weekDates.length; d++) {
    var wd      = weekDates[d];
    var isToday = wd.getTime() === TODAY.getTime();
    var isPast  = wd < TODAY;

    var th = document.createElement('th');
    th.className = 'grid-th-day';
    if (isToday) th.classList.add('grid-th-today');

    var nameSpan = document.createElement('span');
    nameSpan.className = 'grid-day-name';
    nameSpan.textContent = DAY_NAMES[d];

    var numSpan = document.createElement('span');
    numSpan.className = 'grid-day-num';
    if (isToday) numSpan.classList.add('grid-day-today');
    numSpan.textContent = wd.getDate();

    th.appendChild(nameSpan);
    th.appendChild(numSpan);
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  // ── tbody ──
  var tbody = document.createElement('tbody');

  for (var t = 0; t < times.length; t++) {
    var time = times[t];
    var tr   = document.createElement('tr');

    var tdTime = document.createElement('td');
    tdTime.className = 'grid-td-time';
    tdTime.textContent = time;
    tr.appendChild(tdTime);

    for (var dd = 0; dd < weekDates.length; dd++) {
      var cellDate    = weekDates[dd];
      var cellDateStr = fmtDate(cellDate);
      var isPastDay   = cellDate < TODAY;
      var slot        = Store.Slots.exists(activeTeacherId, cellDateStr, time);

      // Determine cell state from student's perspective
      var cellClass;
      var isClickable = false;

      if (!slot || slot.status === 'disabled' || slot.status === 'timeout' || isPastDay) {
        cellClass = 'gc-empty';
      } else if (slot.status === 'available' || slot.status === 'recurring') {
        cellClass = 'gc-available';
        isClickable = true;
      } else if (slot.status === 'booked' && slot.studentId === currentUser.uid) {
        cellClass = 'gc-mine';
        isClickable = true;
      } else {
        // booked by someone else
        cellClass = 'gc-empty';
      }

      var td   = document.createElement('td');
      td.className = 'grid-td-cell';

      var cell = document.createElement('div');
      cell.className = 'grid-cell ' + cellClass;
      cell.dataset.date   = cellDateStr;
      cell.dataset.time   = time;
      cell.dataset.slotid = slot ? slot.slotId : '';

      if (isClickable) {
        cell.addEventListener('click', onStudentCellClick);
      }

      td.appendChild(cell);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

function onStudentCellClick(e) {
  var cell   = e.currentTarget;
  var date   = cell.dataset.date;
  var time   = cell.dataset.time;
  var slotId = cell.dataset.slotid;
  var isMine = cell.classList.contains('gc-mine');

  if (isMine) {
    // Cancel booking
    var result = Modal.show({
      title: 'Cancel booking',
      bodyHTML: '<p>Cancel your booking at <strong>' + time + ' – ' + Store.slotEndTime(time) + '</strong> on ' + date + '?</p>',
      footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Keep it</button><button class="btn btn-danger" id="modal-confirm">Cancel booking</button>'
    });
    document.getElementById('modal-cancel').addEventListener('click', result.close);
    document.getElementById('modal-confirm').addEventListener('click', function() {
      Store.Slots.update(slotId, { status: 'available', studentId: null });
      Toast.success('Booking cancelled.');
      renderStats();
      renderStudentGrid();
      result.close();
    });
  } else {
    // Book slot
    var slot = Store.Slots.exists(activeTeacherId, date, time);
    if (!slot) return;
    Store.Slots.update(slot.slotId, { status: 'booked', studentId: currentUser.uid });
    Toast.success('Booked: ' + time + ' – ' + Store.slotEndTime(time));
    renderStats();
    renderStudentGrid();
  }
}

/* ── Helpers ────────────────────────────────────────────── */
function getSgridWeekDates() {
  var dates = [];
  for (var d = 0; d < 7; d++) {
    var wd = new Date(sgridWeekStart);
    wd.setDate(wd.getDate() + d);
    dates.push(wd);
  }
  return dates;
}

function sgridWeekRangeLabel(dates) {
  return dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ' – '
    + dates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
