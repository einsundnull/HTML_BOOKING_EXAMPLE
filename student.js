/**
 * student.js — Student View Logic
 *
 * Student can:
 *  - Browse teacher catalog and select/deselect teachers
 *  - View a selected teacher's calendar
 *  - Book available slots
 *  - Delete their own bookings
 *  - Move (reschedule) their own bookings
 */

let currentUser    = null;
let activeView     = 'catalog'; // 'catalog' | 'calendar'
let activeTeacherId = null;
let viewYear       = null;
let viewMonth      = null;
let selectedDate   = null;

const TODAY = new Date();
TODAY.setHours(0,0,0,0);

/* ── Init ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.require('student');
  if (!currentUser) return;

  document.getElementById('topbar-name').textContent = currentUser.name;

  const now = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
  document.getElementById('nav-catalog').addEventListener('click', () => switchView('catalog'));
  document.getElementById('nav-calendar').addEventListener('click', () => switchView('calendar'));

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
  const selections = Store.Selections.byStudent(currentUser.uid);
  const bookings   = Store.Bookings.byStudent(currentUser.uid).filter(b => b.status === 'booked');
  document.getElementById('stat-teachers').textContent = selections.length;
  document.getElementById('stat-bookings').textContent = bookings.length;
}

/* ══════════════════════════════════════════════════════════
   CATALOG VIEW
══════════════════════════════════════════════════════════ */
function renderCatalog() {
  const allTeachers = Store.Users.byRole('teacher');
  const mySelections = Store.Selections.byStudent(currentUser.uid).map(s => s.teacherId);
  const container = document.getElementById('catalog-grid');

  if (!allTeachers.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="10" r="6" stroke="currentColor" stroke-width="1.5"/>
          <path d="M4 28c0-6.627 5.373-10 12-10s12 3.373 12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No teachers available yet.</p>
      </div>`;
    return;
  }

  container.innerHTML = allTeachers.map(teacher => {
    const isSelected = mySelections.includes(teacher.uid);
    const availableSlots = Store.Bookings.byTeacher(teacher.uid)
      .filter(b => b.status === 'available').length;

    return `
      <div class="card teacher-card ${isSelected ? 'teacher-card-selected' : ''}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-2);margin-bottom:var(--sp-3)">
          <div>
            <div style="font-weight:var(--weight-semibold);color:var(--neutral-900);margin-bottom:var(--sp-1)">${teacher.name}</div>
            <code style="font-size:var(--text-caption);background:var(--neutral-100);padding:2px 6px;border-radius:3px;color:var(--neutral-600)">${teacher.uid}</code>
          </div>
          ${isSelected
            ? `<span style="font-size:var(--text-caption);font-weight:var(--weight-semibold);color:var(--color-600);background:var(--color-50);border:1px solid var(--color-200);padding:2px var(--sp-2);border-radius:var(--radius-sm)">Selected</span>`
            : ''
          }
        </div>
        <div style="font-size:var(--text-caption);color:var(--neutral-500);margin-bottom:var(--sp-3)">
          ${availableSlots} available slot${availableSlots !== 1 ? 's' : ''}
        </div>
        <div style="display:flex;gap:var(--sp-2)">
          ${isSelected
            ? `
              <button class="btn btn-secondary btn-sm" onclick="openTeacherCalendar('${teacher.uid}')">View calendar</button>
              <button class="btn btn-ghost btn-sm" onclick="deselect('${teacher.uid}')">Remove</button>
            `
            : `<button class="btn btn-primary btn-sm" onclick="selectTeacher('${teacher.uid}')">Select</button>`
          }
        </div>
      </div>`;
  }).join('');
}

function selectTeacher(teacherId) {
  Store.Selections.create(currentUser.uid, teacherId);
  const teacher = Store.Users.byUid(teacherId);
  Toast.success(`${teacher.name} added to your teachers.`);
  renderStats();
  renderCatalog();
}

function deselect(teacherId) {
  Store.Selections.delete(currentUser.uid, teacherId);
  const teacher = Store.Users.byUid(teacherId);
  Toast.success(`${teacher.name} removed.`);
  renderStats();
  renderCatalog();
}

function openTeacherCalendar(teacherId) {
  activeTeacherId = teacherId;
  selectedDate = null;
  switchView('calendar');
  renderTeacherPicker();
}

/* ══════════════════════════════════════════════════════════
   CALENDAR VIEW
══════════════════════════════════════════════════════════ */
function renderTeacherPicker() {
  const myTeachers = Store.Selections.byStudent(currentUser.uid)
    .map(s => Store.Users.byUid(s.teacherId))
    .filter(Boolean);

  const picker = document.getElementById('teacher-picker');

  if (!myTeachers.length) {
    picker.innerHTML = `<p class="text-muted">No teachers selected yet. Go to the catalog first.</p>`;
    document.getElementById('cal-section').style.display = 'none';
    return;
  }

  picker.innerHTML = `
    <div class="form-group" style="max-width:280px">
      <label class="form-label" for="teacher-select">Teacher</label>
      <select class="form-select" id="teacher-select">
        ${myTeachers.map(t =>
          `<option value="${t.uid}" ${t.uid === activeTeacherId ? 'selected' : ''}>${t.name}</option>`
        ).join('')}
      </select>
    </div>`;

  // Auto-select first if none
  if (!activeTeacherId) activeTeacherId = myTeachers[0].uid;
  document.getElementById('teacher-select').value = activeTeacherId;

  document.getElementById('teacher-select').addEventListener('change', e => {
    activeTeacherId = e.target.value;
    selectedDate = null;
    renderCalendar();
    renderSlotPanel();
  });

  document.getElementById('cal-section').style.display = '';
  document.getElementById('prev-btn').addEventListener('click', prevMonth);
  document.getElementById('next-btn').addEventListener('click', nextMonth);

  renderCalendar();
  renderSlotPanel();
}

/* ── Calendar ─────────────────────────────────────────── */
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function renderCalendar() {
  document.getElementById('month-label').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const grid = document.getElementById('cal-days');
  grid.innerHTML = '';

  const first   = new Date(viewYear, viewMonth, 1);
  let startDow  = first.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays    = new Date(viewYear, viewMonth, 0).getDate();

  for (let i = startDow - 1; i >= 0; i--) {
    grid.appendChild(makeDayCell(prevDays - i, true));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(viewYear, viewMonth, d);
    const isPast  = date < TODAY;
    const isToday = date.getTime() === TODAY.getTime();
    const isSel   = selectedDate && date.getTime() === selectedDate.getTime();
    const dateStr = fmtDate(date);

    const teacherSlots = activeTeacherId
      ? Store.Bookings.byTeacher(activeTeacherId).filter(b => b.date === dateStr)
      : [];
    const hasAvail  = teacherSlots.some(s => s.status === 'available');
    const hasMyBook = teacherSlots.some(s => s.studentId === currentUser.uid);

    const cell = makeDayCell(d, false, isToday, isSel, hasAvail && !isPast, hasMyBook);
    if (!isPast) {
      cell.addEventListener('click', () => {
        selectedDate = date;
        renderCalendar();
        renderSlotPanel();
      });
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'button');
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectedDate = date;
          renderCalendar();
          renderSlotPanel();
        }
      });
    }
    grid.appendChild(cell);
  }

  const total    = startDow + daysInMonth;
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= trailing; i++) {
    grid.appendChild(makeDayCell(i, true));
  }
}

function makeDayCell(num, otherMonth, isToday, isSelected, hasAvail, hasMyBook) {
  const el = document.createElement('div');
  el.className = 'cal-day';
  el.textContent = num;
  if (otherMonth)  el.classList.add('other-month');
  if (isToday)     el.classList.add('today');
  if (isSelected)  el.classList.add('selected');
  if (hasAvail)    el.classList.add('has-avail');
  if (hasMyBook)   el.classList.add('has-mybook');
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
  const panel = document.getElementById('slot-panel');
  if (!selectedDate || !activeTeacherId) {
    panel.innerHTML = `<p class="text-muted" style="text-align:center;padding:var(--sp-6) 0">Select a day to see slots.</p>`;
    return;
  }

  const dateStr      = fmtDate(selectedDate);
  const teacherSlots = Store.Bookings.byTeacher(activeTeacherId)
    .filter(b => b.date === dateStr)
    .sort((a, b) => a.start.localeCompare(b.start));

  const label = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  const teacher = Store.Users.byUid(activeTeacherId);

  panel.innerHTML = `
    <div style="font-weight:var(--weight-semibold);color:var(--neutral-900);font-size:var(--text-caption);margin-bottom:var(--sp-3)">
      ${label}${teacher ? ` · ${teacher.name}` : ''}
    </div>
    ${!teacherSlots.length
      ? `<p class="text-muted" style="text-align:center;padding:var(--sp-4) 0">No slots on this day.</p>`
      : teacherSlots.map(slot => studentSlotCard(slot)).join('')
    }
  `;
}

function studentSlotCard(slot) {
  const isMyBooking = slot.studentId === currentUser.uid && slot.status === 'booked';
  const isAvailable = slot.status === 'available';

  let bg = 'var(--neutral-50)';
  let border = 'var(--neutral-200)';
  let textColor = 'var(--neutral-500)';
  let label = slot.status;
  let actions = '';

  if (isMyBooking) {
    bg = 'var(--color-50)';
    border = 'var(--color-200)';
    textColor = 'var(--color-700)';
    label = 'Your booking';
    actions = `
      <button class="btn btn-sm btn-secondary" onclick="openMoveModal('${slot.bookingId}')">Move</button>
      <button class="btn btn-sm btn-danger" onclick="cancelBooking('${slot.bookingId}')">Cancel</button>
    `;
  } else if (isAvailable) {
    bg = 'var(--neutral-0)';
    border = 'var(--neutral-200)';
    textColor = 'var(--neutral-700)';
    label = 'Available';
    actions = `<button class="btn btn-sm btn-primary" onclick="bookSlot('${slot.bookingId}')">Book</button>`;
  }

  // Hide slots that are booked by someone else
  if (slot.status === 'booked' && !isMyBooking) return '';
  if (slot.status === 'blocked' || slot.status === 'timeout') return '';

  return `
    <div style="
      display:flex;align-items:center;justify-content:space-between;
      padding:var(--sp-2) var(--sp-3);
      border:1px solid ${border};
      border-radius:var(--radius-sm);
      background:${bg};
      margin-bottom:var(--sp-2);
      gap:var(--sp-3);
    ">
      <div>
        <div style="font-weight:var(--weight-semibold);color:${textColor};font-size:var(--text-caption)">${slot.start} – ${slot.end}</div>
        <div style="font-size:var(--text-caption);color:var(--neutral-500)">${label}</div>
      </div>
      <div style="display:flex;gap:var(--sp-2)">${actions}</div>
    </div>`;
}

/* ── Book Slot ────────────────────────────────────────── */
function bookSlot(bookingId) {
  Store.Bookings.update(bookingId, {
    status: 'booked',
    studentId: currentUser.uid,
  });
  Toast.success('Slot booked.');
  renderStats();
  renderCalendar();
  renderSlotPanel();
}

/* ── Cancel Booking ───────────────────────────────────── */
function cancelBooking(bookingId) {
  const { close } = Modal.show({
    title: 'Cancel booking',
    bodyHTML: `<p style="color:var(--neutral-700)">Are you sure you want to cancel this booking?</p>`,
    footerHTML: `
      <button class="btn btn-ghost" id="modal-cancel">Keep it</button>
      <button class="btn btn-danger" id="modal-confirm">Cancel booking</button>
    `,
  });
  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    Store.Bookings.update(bookingId, { status: 'available', studentId: null });
    Toast.success('Booking cancelled.');
    renderStats();
    renderCalendar();
    renderSlotPanel();
    close();
  });
}

/* ── Move Booking ─────────────────────────────────────── */
function openMoveModal(bookingId) {
  const currentSlot = Store.Bookings.all().find(b => b.bookingId === bookingId);
  if (!currentSlot) return;

  // Get all available slots for this teacher (excluding current)
  const availableSlots = Store.Bookings.byTeacher(activeTeacherId)
    .filter(b => b.status === 'available' && b.bookingId !== bookingId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const optionsHTML = availableSlots.length
    ? availableSlots.map(s => `<option value="${s.bookingId}">${s.date} · ${s.start}–${s.end}</option>`).join('')
    : '<option disabled>No available slots</option>';

  const { close } = Modal.show({
    title: 'Move booking',
    bodyHTML: `
      <p style="font-size:var(--text-caption);color:var(--neutral-500)">
        Current: <strong>${currentSlot.date} · ${currentSlot.start}–${currentSlot.end}</strong>
      </p>
      <div class="form-group">
        <label class="form-label" for="move-target">New slot</label>
        <select class="form-select" id="move-target" ${!availableSlots.length ? 'disabled' : ''}>
          ${optionsHTML}
        </select>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-confirm" ${!availableSlots.length ? 'disabled' : ''}>Move</button>
    `,
  });

  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const targetId = document.getElementById('move-target').value;
    if (!targetId) return;
    // Free old slot
    Store.Bookings.update(bookingId, { status: 'available', studentId: null });
    // Book new slot
    Store.Bookings.update(targetId, { status: 'booked', studentId: currentUser.uid });
    Toast.success('Booking moved.');
    renderStats();
    renderCalendar();
    renderSlotPanel();
    close();
  });
}

/* ── Helpers ──────────────────────────────────────────── */
function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
