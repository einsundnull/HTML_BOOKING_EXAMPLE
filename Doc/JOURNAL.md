# Booking System — Session Journal
Last updated: 2026-03-08

## Purpose
This file is the handoff document for Claude. Every session should read this first.
It contains the full system description, file structure, data model, key logic, and
current state so that work can continue without needing old transcripts.

---

## Tech Rules (NEVER break these)
- **No inline styles** — all CSS in separate files
- **No arrow functions** — use `function() {}`
- **No `?.` or `??`** — use explicit checks
- **`var` only** — no `let` or `const`
- **String concatenation** — no template literals
- **No comments left in code** unless explicitly asked
- CSS load order: tokens → base → components → navbar → page-specific

---

## Design Tokens
- Font: Figtree (Google Fonts), weights 400 + 600
- Navy scale: `--color-50` through `--color-900` (dark navy)
- Neutral scale: `--neutral-0` (white) through `--neutral-900`
- Spacing: `--sp-1` (4px) through `--sp-6` (24px), 8-pt grid
- Timeout yellow: bg `#fef9ec`, border `#f5d97e`, text `#7a5c00`
- **Pending amber**: bg `#fef9ec`, border `#f5a623`, text `#7a5c00`
- Toast: success (blue-grey), error (dark red `#3d1515`), info (dark navy `#1a2a3a`)
- Border radius: `--radius-sm`
- Shadow: `--shadow`

---

## File Structure
```
booking-app/
├── index.html          — login/role selector
├── admin.html          — admin panel
├── teacher.html        — teacher panel
├── student.html        — student panel
├── debug.html          — debug/reset tool
├── navbar.html         — shared navbar partial
├── css/
│   ├── tokens.css      — design tokens (vars)
│   ├── base.css        — resets, typography, shared utils, pending styles
│   ├── components.css  — buttons, cards, forms, modals, toasts
│   ├── navbar.css      — top nav bar
│   ├── teacher.css     — teacher-specific styles
│   └── student.css     — student-specific styles
└── js/
    ├── store.js        — localStorage API (single source of truth)
    ├── auth.js         — session via ?uid= URL param
    ├── ui.js           — Toast.success/error/info, Modal.confirm
    ├── navbar.js       — shared navbar logic
    ├── admin.js        — admin panel logic
    ├── teacher.js      — teacher panel logic (~1537 lines)
    └── student.js      — student panel logic (~931 lines)
```

---

## Data Model (localStorage)

### app_users
```json
[{ "uid": "t1", "name": "Teacher One", "role": "teacher" }]
```
Roles: `admin` | `teacher` | `student`

### app_slots
```json
[{
  "slotId": "uuid",
  "teacherId": "t1",
  "studentId": "s1" | null,
  "date": "2026-03-07",
  "time": "09:00",
  "status": "available" | "booked" | "disabled" | "timeout",
  "baseStatus": "available" | "disabled" | "timeout"
}]
```
- `status` = current effective status
- `baseStatus` = teacher-set permanent state (survives bookings/cancels)
- Slot duration: 30 min fixed. End time = `Store.slotEndTime(time)`

### app_recurring
```json
[{ "recurringId": "uuid", "teacherId": "t1", "dayOfWeek": 0, "time": "09:00" }]
```
- `dayOfWeek`: 0=Mon … 6=Sun
- Setting a slot `available` → creates Recurring rule
- Setting `disabled` → deletes Recurring rule
- Setting `timeout` → Recurring rule stays (slot reappears next week)

### app_selections
```json
[{ "studentId": "s1", "teacherId": "t1" }]
```
Links which students belong to which teacher.

---

## Status Matrix
```
baseStatus │ studentId │ Teacher sees      │ Student (owner) │ Other student
───────────────────────────────────────────────────────────────────────────
available  │ null      │ Available         │ Available       │ Available
available  │ S1        │ Booked (S1)       │ Booked (mine)   │ Unavailable
disabled   │ null      │ Disabled          │ Unavailable     │ Unavailable
disabled   │ S1        │ Booked (S1)       │ Booked (mine)   │ Unavailable
timeout    │ null      │ Timeout           │ Unavailable     │ Unavailable
timeout    │ S1        │ Booked (S1)*      │ Booked (mine)   │ Unavailable
* yellow border = conflict indicator
```

---

## Store API
```js
Store.Users.all() / byUid(uid) / byRole(role) / create({uid,name,role}) / delete(uid)

Store.Slots.all() / byTeacher(tid) / byStudent(sid) / byTeacherDate(tid, date)
  .exists(tid, date, time) → slot | null
  .create({teacherId, studentId, date, time, status, baseStatus})
  .createRange(tid, date, startTime, endTime, status)
  .update(slotId, patch)
  .bookSlot(slotId, studentId)       — status=booked, preserves baseStatus
  .cancelBooking(slotId)             — studentId=null, status=baseStatus
  .setAvailability(slotId, newBase)  — sets baseStatus + status (if not booked)
  .delete(slotId)
  .deleteByUser(uid)

Store.Recurring.all() / byTeacher(tid) / exists(tid, dow, time)
  .create(tid, dayOfWeek, time)
  .delete(recurringId)
  .deleteByTeacherDayTime(tid, dow, time)
  .deleteByTeacher(tid)
  .materialiseWeek(tid, weekDates)   — weekDates = array of 7 Date objects Mon–Sun

Store.Selections.all() / byStudent(sid) / byTeacher(tid)
  .exists(sid, tid) / .create(sid, tid) / .delete(sid, tid) / .deleteByUser(uid)

Store.slotEndTime(time) → 'HH:MM'
Store.slotTimesInRange(start, end) → ['HH:MM', ...]
Store.Bookings → alias to Store.Slots
```

---

## Session / Auth
- URL param: `?uid=xxx` (e.g. `teacher.html?uid=t1`)
- `auth.js` reads uid, loads user, sets `window.currentUser`
- No passwords, admin seeds itself on first load

---

## Teacher Panel (teacher.js + teacher.html + teacher.css)

### Views
- **Schedule** (default): Calendar + Day Panel
- **All Bookings**: full list of all booked slots, filterable by student

### Calendar
- Month grid, click day → opens Day Panel
- Dots on days that have bookings
- `materialiseVisibleMonth()` called on render — creates slots from Recurring rules
- Header: month nav + `[Add slots]` button (opens Week Grid overlay)

### Day Panel — Two Tabs
**Tab 1: Verfügbarkeit**
- Shows each slot's `baseStatus`
- Available slot: `[Disable]` `[Timeout]` buttons
  - Disable → `setAvailability('disabled')` + delete Recurring rule
  - Timeout → `setAvailability('timeout')`, Recurring stays; if booked → warning dialog
- Disabled/timeout slot: `[Enable]` → `setAvailability('available')` + Recurring.create

**Tab 2: Buchungen**
- Shows all slots for the day
- Collapsed card: time left, `[+ Book]` or `[Cancel]` right
- Click `[+ Book]` → expands inline booking form:
  - Student checkboxes (multi-select)
  - From dropdown + Until dropdown (side by side)
  - `[Book]` `[Close]` buttons
- `[+ Book]` label becomes `[− Hide]` when form is open

### Pending / Staging System (Teacher)
```js
var pendingBookings = {};
// { slotId: { action:'book'|'cancel', originalSlot, newStudentId, extraStudents[] } }
```
- **No immediate Store writes** — all changes staged to `pendingBookings`
- `getEffectiveTeacherSlot(storeSlot)` → applies pending override for UI display
  - For `book`: status=booked, studentId=newStudentId, _pending='book'
  - For `cancel`: keeps original status/studentId, adds _pending='cancel' (IMPORTANT: do NOT clear studentId — needed for display grouping)
- `commitBooking()` → stages to pendingBookings
- `cancelBookingFromPanel()` → stages to pendingBookings
- `saveBookingChanges()` → writes all pending to Store, clears pending
- `discardBookingChanges()` → clears pendingBookings, re-renders, Toast.info

### Save/Dismiss FAB (Teacher)
```html
<div id="booking-fab-group" class="booking-fab-group">
  <button id="booking-dismiss-btn" class="booking-fab booking-fab-dismiss">🗙 Dismiss</button>
  <button id="booking-save-btn" class="booking-fab booking-fab-save">✓ Save [N]</button>
</div>
```
- Positioned: `fixed; bottom: sp-5; left: 50%; transform: translateX(-50%)`
- Shows when `pendingBookings` count > 0
- Dismiss = red (`#b91c1c`), Save = green (`#15803d`)
- Connected in teacher.html `window.load` listener

### All Bookings View
- `renderAllBookingsList()`: reads Store slots filtered by booked status
  - Also includes pending-cancel slots (keeps original studentId for grouping)
  - Marks pending slots with `_pending = 'cancel'` flag
- `mergeAllBookingBlocks()`: merges consecutive same-student slots into blocks
  - Sets `block.hasPending = true` if any slot in block is pending
- `buildAllBookingBlock()`: uses `block.hasPending` for amber header
- `populateAllBookingDetail()`: uses `pendingBookings[slot.slotId]` directly for row amber

### Week Grid Overlay
- Opened via `[Add slots]` button
- 7-column grid, all slots for the week
- Cell colors: `gc-available` (green), `gc-booked` (navy), `gc-timeout` (yellow), `gc-empty`
- Click available → toggle timeout/available, click booked → warning dialog
- Pending cells: `gc-pending` class (amber outline)
- Save grid: `flushGridPending()` — available→creates Recurring, disabled→deletes, timeout→Recurring stays

### Pending Visual (amber)
```css
/* base.css */
.slot-card-pending, .slot-pending {
  background: #fef9ec !important;
  border: 2px solid #f5a623 !important;
}
.slot-card-pending *, .slot-pending * { color: #7a5c00 !important; }
.block-pending { background: #fef9ec !important; border-left: 3px solid #f5a623 !important; }
.gc-pending { background: #fef3c7 !important; outline: 2px solid #f5a623; }
```
```css
/* teacher.css — overrides navy booked cards */
.slot-card-pending.slot-card-booked,
.slot-card-pending.slot-card-booked .slot-card-time, ... { color: #7a5c00 !important; }
.all-booking-block-header.block-pending { background: #fef9ec !important; border: 2px solid #f5a623 !important; }
.all-booking-block-header.block-pending * { color: #7a5c00 !important; }
```

---

## Student Panel (student.js + student.html + student.css)

### Views (nav tabs)
- **Schedule** (default): teacher picker + calendar + day slot list
- **My Bookings**: chronological list of all own bookings

### Schedule Flow
1. Student picks teacher from dropdown
2. Calendar shows available days (green dots) and booked days (navy dots)
3. Click day → shows slot list below calendar
4. Available slots: time + `[Book]` button
5. Booked (mine) slots: collapsible navy block, expand → Cancel per slot

### Pending / Staging System (Student)
```js
var pendingDayChanges = {};
// { slotId: { action:'book'|'cancel', originalSlot, newStudentId } }
```
- `getEffectiveSlot(storeSlot)`:
  - `book`: status=booked, studentId=currentUser.uid, _pending='book'
  - `cancel`: keeps original status/studentId, adds _pending='cancel' ONLY
    (do NOT clear studentId — needed so slot stays in booked block group)
- `bookDaySlot(slotId)` → stages, undo if was pending-cancel
- `cancelDaySlot(slotId)` → stages, undo if was pending-book
- `commitDayChanges()` → writes to Store, clears pending, re-renders

### Student Done FAB
```html
<div id="day-save-btn" class="day-save-fab">✓ Done [N]</div>
```
- Same pill style as teacher FAB but single button
- Positioned bottom-right (student page)
- NOTE: Student has no Dismiss button (only teacher has Dismiss+Save pair)

### Mine Block Pending (Student)
- `buildMineDayBlock()`: header gets `block-pending` class if any slot has `_pending`
- `populateMineDetail()`: each row gets `slot-pending` class if `slot._pending`
  - Button text: `'Undo'` if `slot._pending === 'cancel'`, else `'Cancel'`
```css
/* student.css */
.day-block-mine.block-pending { background: #fef9ec !important; border: 2px solid #f5a623 !important; }
.day-block-mine.block-pending .day-block-time,
.day-block-mine.block-pending .day-block-meta,
.day-block-mine.block-pending .day-block-chevron { color: #7a5c00 !important; }
```

### My Bookings Tab
- `renderMyBookings()`: chronological list, day dividers
- `mergeMyBookingBlocks()`: consecutive same-teacher slots merged
- `buildMyBookingBlock()`: navy block, teacher name, click → jumps to calendar day

---

## Key CSS Classes Reference

### Shared (base.css / components.css)
- `.btn .btn-primary .btn-ghost .btn-danger .btn-sm` — buttons
- `.card` — white card with border-radius + shadow
- `.form-select .form-label` — form elements
- `.slot-card-pending .slot-pending .block-pending .gc-pending` — amber pending

### Teacher (teacher.css)
- `.slot-card` — booking card wrapper (flex-column)
- `.slot-card-top-row` — time (left) + button (right), `space-between`
- `.slot-card-info` — left side of top row (flex-column)
- `.slot-card-time .slot-card-student .slot-card-status` — text inside card
- `.slot-card-actions` — right side, button group
- `.slot-action-btn` — inline action button
- `.slot-card-available / -disabled / -timeout / -booked` — color variants
- `.day-tab-nav .day-tab-btn .day-tab-btn.active` — sub-tabs
- `.booking-form` — inline booking form
- `.booking-form-time-row .booking-form-time-col` — From/Until side by side
- `.booking-form-btns` — Book + Close buttons (flex-start)
- `.booking-form-students .booking-form-check-row .booking-form-checkbox`
- `.booking-fab-group .booking-fab .booking-fab-dismiss .booking-fab-save`
- `.slot-grid-overlay .grid-topbar .grid-scroll .slot-grid-table`
- `.gc-available .gc-booked .gc-timeout .gc-empty .gc-mine .gc-pending`
- `.all-booking-block-wrapper .all-booking-block-header .all-booking-block-detail`
- `.all-booking-slot-row .all-booking-slot-time .all-booking-slot-status`
- `.all-bookings-day-divider`
- `#all-bookings-list { padding-bottom: 80px }` — avoid FAB overlap

### Student (student.css)
- `.day-block-wrapper .day-block-header .day-block-mine .day-block-detail`
- `.day-block-time .day-block-meta .day-block-chevron`
- `.day-block-slot-row` — flex-column: time on top, Cancel below
- `.day-slot-row` — available slot row
- `.day-save-fab .day-save-fab.is-visible` — Done FAB
- `.my-booking-block .my-booking-block-header .my-booking-arrow`

---

## Known Issues / Watch Out For
1. **Pending cancel must NOT clear studentId** in getEffectiveSlot/getEffectiveTeacherSlot
   — studentId is needed for grouping in merge functions. Only add `_pending` flag.
2. **CSS specificity**: navy `.slot-card-booked` and `.day-block-mine` override amber.
   Always add explicit `!important` overrides for pending states on navy elements.
3. **`renderAllBookingsList`** must include pending-cancel slots using original Store data
   (filter: `status === 'booked'` from Store, then add `_pending` flag via map).
4. **FAB visibility**: `updateBookingSaveBtn()` targets `#booking-fab-group` not `#booking-save-btn`.
   The old `#booking-save-btn` standalone CSS block was removed from teacher.css.
5. **Week grid pending**: `flushGridPending()` handles recurring rule management separately
   from `saveBookingChanges()` — they are different pending stores.
6. **`materialiseWeek`** is called in `renderDayPanel()` and `renderCalendar()` —
   it is idempotent (won't duplicate slots).

---

## Previous Transcripts (for deep history)
- `/mnt/transcripts/2026-03-06-12-13-49-booking-system-build-1.txt`
- `/mnt/transcripts/2026-03-06-19-30-02-booking-system-build-debug.txt`
- `/mnt/transcripts/2026-03-06-20-47-00-booking-system-navbar-slots-refactor.txt`
- `/mnt/transcripts/2026-03-07-06-20-51-booking-system-recurring-slots-student-ui.txt`
- `/mnt/transcripts/2026-03-07-16-51-32-booking-system-teacher-student-grid.txt`
- `/mnt/transcripts/2026-03-07-17-37-40-booking-system-staging-availability.txt`
