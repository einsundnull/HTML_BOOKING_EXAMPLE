# BOOKING SYSTEM — SESSION INIT
*Lies diese Datei am Anfang jeder neuen Session vollständig.*

---

## PROJEKT-ÜBERSICHT

Multi-Rollen Buchungssystem (Admin / Teacher / Student).
Backend: **localStorage** (kein Server).
Design: Navy `#060f1c`, Font: **Figtree**, 8-pt Grid.
Session via URL-Parameter: `?uid=xxx`
Regel: **kein inline-style**, alles in CSS-Dateien.
JS-Stil: `var`, `function(){}`, String-Concat — **keine Arrow-Functions, kein ?./??**

---

## DATEISTRUKTUR

```
/mnt/user-data/outputs/booking-app/
├── index.html
├── admin.html
├── teacher.html
├── student.html
├── debug.html
├── navbar.html
├── css/
│   ├── tokens.css       — Design-Tokens (Farben, Spacing, Typo)
│   ├── base.css         — Reset, App-Shell, Toast, FAB-Pill, Jump-Buttons, Day-Nav-Bar
│   ├── components.css   — Buttons, Cards, Modals, Stats-Row, Forms
│   ├── navbar.css       — Topbar / Navbar
│   ├── teacher.css      — Teacher-Layout, Slot-Cards, Grid, All-Bookings
│   └── student.css      — Student-Layout, Katalog, Kalender, Day-Slots, Mine-Blocks
└── js/
    ├── store.js         — localStorage API
    ├── auth.js          — Auth.require(role)
    ├── ui.js            — Toast, Modal, Icons
    ├── navbar.js        — Navbar.init()
    ├── teacher.js       — ~1633 Zeilen
    └── student.js       — ~1046 Zeilen
```

---

## CSS-LADEREIHENFOLGE

**teacher.html:** tokens → base → components → navbar → teacher
**student.html:** tokens → base → components → navbar → teacher → student

*Student lädt teacher.css wegen geteilter Grid-Styles (slot-grid-table, gc-*, grid-topbar).*

---

## DATENMODELL (localStorage)

```
app_users:     [{uid, name, role}]
app_slots:     [{slotId, teacherId, studentId, date, time, status, baseStatus}]
               status:     'available'|'booked'|'disabled'|'timeout'
               baseStatus: 'available'|'disabled'|'timeout'
app_recurring: [{recurringId, teacherId, dayOfWeek(0=Mo..6=So), time}]
app_selections:[{studentId, teacherId}]
```

---

## STORE API

```js
Store.Users.all/byUid/byRole/create/delete
Store.Slots.all/byTeacher/byStudent/byTeacherDate/exists/create/createRange/update/delete/deleteByUser
  .bookSlot(slotId, studentId)     → status=booked, behält baseStatus
  .cancelBooking(slotId)           → studentId=null, status=baseStatus
  .setAvailability(slotId, newBase)→ setzt baseStatus+status (wenn nicht booked)
Store.Recurring.all/byTeacher/exists/create/delete/deleteByTeacherDayTime/deleteByTeacher
  .materialiseWeek(tid, weekDates) → idempotent, erstellt Slots aus recurring rules
Store.Selections.all/byStudent/byTeacher/exists/create/delete/deleteByUser
Store.slotEndTime(time)            → 'HH:MM'
Store.slotTimesInRange(start, end) → ['HH:MM',...]
Store.Bookings                     → Alias zu Store.Slots
```

---

## TEACHER.JS — KERNFUNKTIONEN

### Pending-System
```js
var pendingBookings = {}
// {slotId: {action:'book'|'cancel', originalSlot, newStudentId, extraStudents[]}}
```
- `getEffectiveTeacherSlot(storeSlot)` — bei 'cancel': behält originalStatus/studentId, setzt nur `_pending='cancel'`
- `commitBooking()` / `cancelBookingFromPanel()` → staged in pendingBookings (TOGGLE: nochmal klicken = undo)
- `saveBookingChanges()` → schreibt alles in Store, leert pending, re-rendert
- `discardBookingChanges()` → leert pendingBookings, re-rendert, Toast.info

### Save/Dismiss FAB (Teacher)
```html
<div id="booking-fab-group" class="booking-fab-group">
  <button id="booking-dismiss-btn" class="booking-fab booking-fab-dismiss">Dismiss</button>
  <button id="booking-save-btn"    class="booking-fab booking-fab-save">Save <span class="save-badge">0</span></button>
</div>
```
- Position: `fixed; bottom:sp-5; left:0; right:0; margin:auto; width:fit-content` → ZENTRIERT
- `updateBookingSaveBtn()` targett `#booking-fab-group` (nicht den Button direkt)
- CSS in **base.css** (nicht teacher.css) — geteilt mit Student

### Day-Panel Sub-Tabs
- `activeDayTab = 'availability'|'bookings'`
- Tab 1 Verfügbarkeit: `buildAvailabilityCard()` — Disable/Timeout/Enable
- Tab 2 Buchungen: `buildBookingCard()` — collapsed: Zeit + [+Book]/[Cancel] rechts
  - Expanded: inline Booking-Form mit Students-Checkboxen + From/Until Dropdowns + [Book][Close]
  - [+Book] wird [−Hide] wenn offen
  - Kein "available" Status-Label

### All-Bookings-View
- `renderAllBookingsList()` — liest Store gebuchte + pending-cancel Slots
- `mergeAllBookingBlocks()` → setzt `block.hasPending`
- `buildAllBookingBlock()` → amber Header wenn `block.hasPending`
- WICHTIG: `renderAllBookingsList` nutzt originale Store-Daten + `_pending` Flag — NICHT `getEffectiveTeacherSlot`

### Section-Jump (Teacher)
- Targets im schedule-view: `#section-calendar` + `#section-daypanel` (NICHT view-all-bookings)
- Targets im all-bookings-view: `#view-all-bookings`
- `getStickyOffset()` misst Navbar + Day-Nav-Bar dynamisch

---

## STUDENT.JS — KERNFUNKTIONEN

### Pending-System
```js
var pendingDayChanges = {}
// {slotId: {action:'book'|'cancel', originalSlot, newStudentId}}
```
- `getEffectiveSlot(storeSlot)` — bei 'book': status=booked, studentId=uid, _pending='book'
  bei 'cancel': behält originalStatus/studentId, setzt nur _pending='cancel'
- `bookDaySlot(slotId)` → staged book (undo wenn pending-cancel)
  → sucht rückwärts nach Gruppen-Start → setzt `expandedDayBlocks['mine-'+groupStart]=true`
- `cancelDaySlot(slotId)` → TOGGLE: wenn pending → delete (undo); sonst → staged cancel
- `commitDayChanges()` → schreibt in Store, leert pending
- `discardDayChanges()` → leert pending, re-rendert, Toast.info

### Save/Dismiss FAB (Student)
```html
<div id="day-save-group" class="booking-fab-group day-save-group">
  <button id="day-dismiss-btn" class="booking-fab booking-fab-dismiss">Dismiss</button>
  <button id="day-save-btn"    class="booking-fab booking-fab-save">Done <span class="save-badge">0</span></button>
</div>
```
- Selbe CSS-Klassen wie Teacher (`.booking-fab-group` in base.css)
- `updateDaySaveBtn()` targett `#day-save-group`

### Day-Slot-Liste (Mine-Blocks)
- Aufklappbare Blöcke für konsekutive gebuchte Slots
- `expandedDayBlocks = {}` — `{blockKey: bool}` wobei `blockKey = 'mine-' + block.start`
- Beim Buchen: Auto-aufklappen via `expandedDayBlocks['mine-'+groupStart]=true`
- Amber-Highlight wenn `_pending` auf einem Slot im Block

### Section-Jump (Student)
- Targets im calendar-view: `#cal-section` + `#day-slots`
- Targets im my-bookings-view: `#view-my-bookings`
- `getStickyOffset()` — identisch zu teacher.js

---

## SHARED CSS — BASE.CSS KRITISCHE BLÖCKE

### Pending Amber
```css
.slot-card-pending, .slot-pending { background:#fef9ec !important; border:2px solid #f5a623 !important; }
.slot-card-pending *, .slot-pending * { color:#7a5c00 !important; }
.block-pending { background:#fef9ec !important; border-left:3px solid #f5a623 !important; }
.gc-pending    { background:#fef3c7 !important; outline:2px solid #f5a623; }
```

### Booking FAB Pill (Teacher + Student)
```css
.booking-fab-group {
  position: fixed; bottom: sp-5;
  left: 0; right: 0; margin: auto; width: fit-content;  /* NICHT left:50% — bricht mobile */
  transform: translateY(8px);
  opacity: 0; pointer-events: none;
}
.booking-fab-group.is-visible { opacity:1; pointer-events:auto; transform:translateY(0); }
.booking-fab-dismiss { background: #b91c1c; }
.booking-fab-save    { background: #15803d; }
```

### Sticky Day-Nav-Bar
```css
.day-nav-bar { position:sticky; top:52px; z-index:90; display:none; ... }
.day-nav-bar.is-visible { display:flex; }
```

### Section Jump Buttons
```css
.section-jumper { position:fixed; bottom:sp-5; right:8px; opacity:0; }
.section-jumper.is-visible { opacity:1; }  /* erscheint nach scrollY > 80px */
.section-jump-btn { width:34px; height:34px; border-radius:999px; background:color-900; }
.section-jump-btn.is-dimmed { opacity:0.25; pointer-events:none; }
```

### Overflow-Fix
```css
html { max-width:100vw; overflow-x:hidden; }  /* verhindert horizontal scroll OHNE fixed zu brechen */
/* KEIN overflow-x auf body oder app-shell — bricht position:fixed */
/* KEIN left:50% auf fixed elementen — erzeugt overflow-anchor auf mobile */
```

---

## TEACHER.CSS KRITISCHE OVERRIDES

```css
/* Amber beats navy on pending booked cards */
.slot-card-pending.slot-card-booked,
.slot-card-pending.slot-card-booked * { color:#7a5c00 !important; background:transparent; }

/* All-Bookings pending header */
.all-booking-block-header.block-pending { background:#fef9ec !important; border:2px solid #f5a623 !important; }
.all-booking-block-header.block-pending * { color:#7a5c00 !important; }

/* FAB-Styles wurden nach base.css verschoben */
```

## STUDENT.CSS KRITISCHE OVERRIDES

```css
/* Amber beats navy on mine blocks */
.day-block-mine.block-pending { background:#fef9ec !important; border:2px solid #f5a623 !important; }
.day-block-mine.block-pending .day-block-time,
.day-block-mine.block-pending .day-block-meta,
.day-block-mine.block-pending .day-block-chevron { color:#7a5c00 !important; }

/* Layout */
.student-cal-layout { grid-template-columns: minmax(0,280px) minmax(0,1fr); }
@media (max-width:600px) { .student-cal-layout { grid-template-columns:1fr; } }
```

---

## KRITISCHE REGELN — NIEMALS BRECHEN

1. **Pending-Cancel darf studentId NICHT löschen** — wird für Gruppierung und Anzeige gebraucht
2. **CSS `!important`** nötig auf allen amber-pending overrides (navy hat höhere Spezifität)
3. **`updateBookingSaveBtn()`** targett `#booking-fab-group` (Teacher) / `updateDaySaveBtn()` targett `#day-save-group` (Student)
4. **Alle Staging-Funktionen sind TOGGLEs** — nochmals klicken = undo pending state
5. **`renderAllBookingsList`** nutzt originale Store-Daten + _pending flag, NICHT getEffectiveTeacherSlot
6. **`viewYear`/`viewMonth`** sind die Kalender-State-Vars (nicht currentYear/currentMonth)
7. **Navbar-Höhe = 52px** (sticky day-nav-bar sitzt bei top:52px)
8. **KEIN `overflow-x:hidden` auf body/app-shell** — bricht `position:sticky` und `position:fixed`
9. **KEIN `left:50%`** auf fixed Elementen auf Mobile — benutze `left:0; right:0; margin:auto`
10. **Booking-FAB CSS in base.css** (nicht teacher.css) — Student lädt teacher.css, aber base.css ist sicherer

---

## DESIGN-TOKENS

```
Navy:    --color-50 bis --color-900
Neutral: --neutral-0 (weiß) bis --neutral-900
Amber (pending): bg #fef9ec, border #f5a623, text #7a5c00
Timeout (yellow): bg #fef9ec, border #f5d97e, text #7a5c00
Dismiss rot: #b91c1c  |  Save grün: #15803d
Toast: success(blue-grey), error(#3d1515), info(#1a2a3a)
Spacing: --sp-1(4px) bis --sp-6(24px)
Container-Pad: 32px Desktop / 16px Tablet / 12px Mobile
```

---

## BEKANNTE BUGS / FIXES AUS DIESER SESSION

| Problem | Ursache | Fix |
|---|---|---|
| Jump-Buttons aus Screen (Student) | `left:50%` auf FAB-Pill erzeugte overflow-anchor auf Android | `left:0; right:0; margin:auto` |
| Sticky Day-Nav-Bar verschwunden | `overflow-x:clip` auf html/body bricht `position:sticky` | Entfernt, `overflow-x:hidden` nur auf `html` |
| Dismiss/Done FAB unsichtbar (Student) | `.booking-fab-group` CSS war nur in teacher.css | CSS nach base.css verschoben |
| Mine-Block klappt nicht auf | Falsche blockKey-Berechnung wenn Slot Teil einer Gruppe | Walk-back Algorithmus in `bookDaySlot` |
| Horizontaler Scroll (beide Seiten) | Grid-Kinder ohne `min-width:0` | `minmax(0,...)` in grid-template-columns |

---

## WIE MAN WEITERMACHT

1. Lies diese Datei
2. Prüfe die Dateien in `/mnt/user-data/outputs/booking-app/`
3. Schaue in `/mnt/transcripts/` für detaillierte Session-History falls nötig
4. Alle Änderungen direkt in `/mnt/user-data/outputs/booking-app/` vornehmen
