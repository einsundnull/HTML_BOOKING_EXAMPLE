/**
 * teacher.js — Teacher View Logic
 *
 * Teacher can:
 *  - See all students who selected them
 *  - Manage calendar slots (available / blocked / timeout)
 *  - See booked slots with student info
 */

let currentUser  = null;
let viewYear     = null;
let viewMonth    = null; // 0-indexed
let selectedDate = null;

const TODAY = new Date();
TODAY.setHours(0,0,0,0);

/* ── Init ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.require('teacher');
  if (!currentUser) return;

  document.getElementById('topbar-name').textContent = currentUser.name;

  const now = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
  document.getElementById('prev-btn').addEventListener('click', prevMonth);
  document.getElementById('next-btn').addEventListener('click', nextMonth);
  document.getElementById('add-slot-btn').addEventListener('click', openAddSlotModal);

  renderStudentList();
  renderCalendar();
  renderDayPanel();
});

/* ── Student List ─────────────────────────────────────── */
function renderStudentList() {
  const selections = Store.Selections.byTeacher(currentUser.uid);
  const container  = document.getElementById('student-list');

  if (!selections.length) {
    container.innerHTML = `<p class="text-muted" style="padding:var(--sp-3) 0">No students yet.</p>`;
    document.getElementById('stat-students').textContent = '0';
    return;
  }

  document.getElementById('stat-students').textContent = selections.length;

  container.innerHTML = selections.map(sel => {
    const student = Store.Users.byUid(sel.studentId);
    if (!student) return '';
    const lessons = Store.Bookings.byStudent(student.uid)
      .filter(b => b.teacherId === currentUser.uid).length;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--neutral-100);">
        <div>
          <div style="font-weight:var(--weight-semibold);color:var(--neutral-900);font-size:var(--text-caption)">${student.name}</div>
          <div style="font-size:var(--text-caption);color:var(--neutral-500)">${lessons} booking${lessons !== 1 ? 's' : ''}</div>
        </div>
        <code style="font-size:var(--text-caption);background:var(--neutral-100);padding:2px 6px;border-radius:3px;color:var(--neutral-600)">${student.uid}</code>
      </div>`;
  }).join('');
}

/* ── Calendar ─────────────────────────────────────────── */
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function renderCalendar() {
  document.getElementById('month-label').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const grid   = document.getElementById('cal-days');
  grid.innerHTML = '';

  const first    = new Date(viewYear, viewMonth, 1);
  let startDow   = first.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays    = new Date(viewYear, viewMonth, 0).getDate();

  // Leading
  for (let i = startDow - 1; i >= 0; i--) {
    grid.appendChild(makeCell(prevDays - i, true));
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const date     = new Date(viewYear, viewMonth, d);
    const isToday  = date.getTime() === TODAY.getTime();
    const isSel    = selectedDate && date.getTime() === selectedDate.getTime();
    const slots    = getSlotsForDate(fmtDate(date));
    const hasAny   = slots.length > 0;
    const hasBooked = slots.some(s => s.status === 'booked');

    const cell = makeCell(d, false, isToday, isSel, hasAny, hasBooked);
    cell.addEventListener('click', () => selectDate(date));
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') selectDate(date);
    });
    grid.appendChild(cell);
  }

  // Trailing
  const total    = startDow + daysInMonth;
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= trailing; i++) {
    grid.appendChild(makeCell(i, true));
  }

  updateStats();
}

function makeCell(num, otherMonth, isToday, isSelected, hasSlots, hasBooked) {
  const el = document.createElement('div');
  el.className = 'cal-day';
  el.textContent = num;
  if (otherMonth)  el.classList.add('other-month');
  if (isToday)     el.classList.add('today');
  if (isSelected)  el.classList.add('selected');
  if (hasSlots)    el.classList.add('has-slots');
  if (hasBooked)   el.classList.add('has-booked');
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
  const panel = document.getElementById('day-panel');

  if (!selectedDate) {
    panel.innerHTML = `
      <p class="text-muted" style="text-align:center;padding:var(--sp-6) 0">
        Select a day to manage slots.
      </p>`;
    return;
  }

  const dateStr = fmtDate(selectedDate);
  const slots   = getSlotsForDate(dateStr);
  const label   = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);gap:var(--sp-2)">
      <div style="font-weight:var(--weight-semibold);color:var(--neutral-900);font-size:var(--text-caption)">${label}</div>
      <button class="btn btn-primary btn-sm" id="add-slot-btn">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Add slot
      </button>
    </div>
    ${slots.length === 0
      ? `<p class="text-muted" style="text-align:center;padding:var(--sp-4) 0">No slots for this day.</p>`
      : `<div id="slots-list">${slots.map(slotCard).join('')}</div>`
    }
  `;

  document.getElementById('add-slot-btn').addEventListener('click', openAddSlotModal);
}

function slotCard(slot) {
  const statusColors = {
    available: { bg: 'var(--color-50)',    border: 'var(--color-200)',   text: 'var(--color-700)' },
    blocked:   { bg: 'var(--neutral-100)', border: 'var(--neutral-300)', text: 'var(--neutral-600)' },
    timeout:   { bg: '#fef9ec',            border: '#f5d97e',            text: '#7a5c00' },
    booked:    { bg: 'var(--color-900)',   border: 'var(--color-900)',   text: 'var(--neutral-0)' },
  };
  const c = statusColors[slot.status] ?? statusColors.available;

  let studentInfo = '';
  if (slot.status === 'booked' && slot.studentId) {
    const student = Store.Users.byUid(slot.studentId);
    studentInfo = student
      ? `<div style="font-size:var(--text-caption);margin-top:var(--sp-1);opacity:0.8">${student.name} (${student.uid})</div>`
      : '';
  }

  return `
    <div style="
      display:flex;align-items:center;justify-content:space-between;
      padding:var(--sp-2) var(--sp-3);
      border:1px solid ${c.border};
      border-radius:var(--radius-sm);
      background:${c.bg};
      margin-bottom:var(--sp-2);
      gap:var(--sp-3);
    ">
      <div>
        <div style="font-weight:var(--weight-semibold);color:${c.text};font-size:var(--text-caption)">
          ${slot.start} – ${slot.end}
        </div>
        ${studentInfo}
      </div>
      <div style="display:flex;align-items:center;gap:var(--sp-2)">
        <span style="
          font-size:var(--text-caption);font-weight:var(--weight-semibold);
          text-transform:uppercase;letter-spacing:0.04em;
          color:${c.text};opacity:0.8;
        ">${slot.status}</span>
        ${slot.status !== 'booked'
          ? `<button class="btn btn-sm" style="background:transparent;border:1px solid ${c.border};color:${c.text};padding:2px var(--sp-2)"
               onclick="cycleStatus('${slot.bookingId}')">Change</button>`
          : ''
        }
        <button class="btn btn-sm" style="background:transparent;border:1px solid ${c.border};color:${c.text};padding:2px var(--sp-2)"
          onclick="deleteSlot('${slot.bookingId}')">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>`;
}

/* ── Add Slot Modal ───────────────────────────────────── */
function openAddSlotModal() {
  if (!selectedDate) return;
  const dateStr = fmtDate(selectedDate);
  const label   = selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  const { close } = Modal.show({
    title: `Add slot — ${label}`,
    bodyHTML: `
      <div class="form-group">
        <label class="form-label" for="slot-start">Start time</label>
        <input class="form-input" type="time" id="slot-start" value="09:00" />
        <span class="form-error-msg" id="e-slot-start" style="display:none"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="slot-end">End time</label>
        <input class="form-input" type="time" id="slot-end" value="09:30" />
        <span class="form-error-msg" id="e-slot-end" style="display:none"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="slot-status">Status</label>
        <select class="form-select" id="slot-status">
          <option value="available">Available</option>
          <option value="blocked">Blocked</option>
          <option value="timeout">Timeout</option>
        </select>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-confirm">Add slot</button>
    `,
  });

  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const start  = document.getElementById('slot-start').value;
    const end    = document.getElementById('slot-end').value;
    const status = document.getElementById('slot-status').value;

    let valid = true;
    if (!start) { showFieldError('e-slot-start', 'Required.'); valid = false; }
    if (!end)   { showFieldError('e-slot-end',   'Required.'); valid = false; }
    if (valid && end <= start) {
      showFieldError('e-slot-end', 'End must be after start.');
      valid = false;
    }
    if (!valid) return;

    Store.Bookings.create({
      teacherId: currentUser.uid,
      studentId: null,
      date: dateStr,
      start,
      end,
      status,
    });

    Toast.success(`Slot ${start}–${end} added.`);
    close();
    renderCalendar();
    renderDayPanel();
  });
}

/* ── Slot Actions ─────────────────────────────────────── */
const STATUS_CYCLE = ['available', 'blocked', 'timeout'];

function cycleStatus(bookingId) {
  const all  = Store.Bookings.all();
  const slot = all.find(b => b.bookingId === bookingId);
  if (!slot || slot.status === 'booked') return;
  const idx  = STATUS_CYCLE.indexOf(slot.status);
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
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
  const allSlots  = Store.Bookings.byTeacher(currentUser.uid);
  const booked    = allSlots.filter(s => s.status === 'booked').length;
  const available = allSlots.filter(s => s.status === 'available').length;

  document.getElementById('stat-booked').textContent    = booked;
  document.getElementById('stat-available').textContent = available;
}

/* ── Helpers ──────────────────────────────────────────── */
function getSlotsForDate(dateStr) {
  return Store.Bookings.byTeacher(currentUser.uid)
    .filter(b => b.date === dateStr)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
