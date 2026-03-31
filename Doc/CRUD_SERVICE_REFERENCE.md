# Booking System — Data Model & CRUD Service Reference

## 1. Storage Layer

**Backend:** `localStorage` (browser-local, no server)
**Serialization:** JSON via `_load(key)` / `_save(key, data)`
**ID Generation:** `crypto.randomUUID()` with fallback `Math.random().toString(36)`

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `app_users` | Array | All users (teachers, students, admin) |
| `app_slots` | Array | All calendar slots (available, booked, timeout, disabled) |
| `app_recurring` | Array | Recurring availability rules (weekly patterns) |
| `app_selections` | Array | Student → Teacher contact relationships |

---

## 2. Entities

### 2.1 User

```
{
  uid:   string   — unique identifier (e.g. "t1", "s2")
  name:  string   — display name
  role:  string   — "teacher" | "student" | "admin"
}
```

**No email, no password.** Auth is URL-param based (`?uid=xxx`).

### 2.2 Slot

```
{
  slotId:     string   — UUID
  teacherId:  string   — owner teacher's UID
  studentId:  string|null — booked student's UID, or null
  date:       string   — "YYYY-MM-DD"
  time:       string   — "HH:MM" (start time, 24h)
  status:     string   — current effective status
  baseStatus: string   — underlying status (before booking layer)
}
```

**Duration:** Fixed 30 minutes (`SLOT_DURATION = 30`). End time = `slotEndTime(time)`.

**Status layer model:**

```
Layer 1 (base):    available | disabled | timeout
Layer 2 (booking): booked (overwrites status, preserves baseStatus)

When booking cancelled → status reverts to baseStatus
When availability changed → baseStatus + status both change (unless booked)
```

**Status values:**

| status | baseStatus | Meaning |
|--------|------------|---------|
| `available` | `available` | Teacher is available, slot is free |
| `disabled` | `disabled` | Teacher removed this slot |
| `timeout` | `timeout` | Teacher set temporary unavailability |
| `booked` | `available` | Student booked an available slot |
| `booked` | `timeout` | Edge case: booking on a timeout slot |

### 2.3 Recurring Rule

```
{
  recurringId: string   — UUID
  teacherId:   string   — owner teacher
  dayOfWeek:   number   — 0=Monday, 1=Tuesday, ..., 6=Sunday
  time:        string   — "HH:MM"
}
```

**Materialisation:** Rules are expanded into concrete `Slot` entries via `materialiseWeek()`. This creates `available` slots for future dates where no slot exists yet. Existing slots (including timeouts) are NOT overwritten.

### 2.4 Selection

```
{
  studentId: string   — the student
  teacherId: string   — the teacher
}
```

**Purpose:** Tracks which students have "selected" (contacted) a teacher. Teacher sees these students in "My Students" list.

---

## 3. CRUD Functions

### 3.1 Users

| Function | Signature | Description |
|----------|-----------|-------------|
| `Users.all()` | `→ User[]` | Read all users |
| `Users.byUid(uid)` | `→ User\|null` | Find by UID (trims whitespace) |
| `Users.byRole(role)` | `→ User[]` | Filter by role |
| `Users.create({uid, name, role})` | `→ User` | Create. Throws if UID exists or fields missing |
| `Users.delete(uid)` | `→ void` | Delete. Cascades: Selections, Slots, Recurring. Cannot delete admin |

**Accessed by:**
- `auth.js` — `Auth.current()`, `Auth.login()`
- `admin.js` — create, delete, list users
- `teacher.js` — `byUid()` to resolve student names
- `student.js` — `byRole('teacher')` for catalog, `byUid()` for names

### 3.2 Slots

| Function | Signature | Description |
|----------|-----------|-------------|
| `Slots.all()` | `→ Slot[]` | Read all slots |
| `Slots.byTeacher(tid)` | `→ Slot[]` | All slots of a teacher |
| `Slots.byStudent(sid)` | `→ Slot[]` | All bookings of a student |
| `Slots.byTeacherDate(tid, date)` | `→ Slot[]` | Slots for teacher + date, sorted by time |
| `Slots.exists(tid, date, time)` | `→ Slot\|null` | Find exact slot |
| `Slots.create({teacherId, date, time, status?, baseStatus?, studentId?})` | `→ Slot` | Create single slot |
| `Slots.createRange(tid, date, start, end, status?)` | `→ number` | Create multiple slots. Skips existing. Returns count created |
| `Slots.update(slotId, patch)` | `→ void` | Generic patch (any fields) |
| `Slots.setAvailability(slotId, newBase)` | `→ void` | Set baseStatus + status (only if unbooked) |
| `Slots.cancelBooking(slotId)` | `→ void` | Clear studentId, restore status to baseStatus |
| `Slots.bookSlot(slotId, studentId)` | `→ void` | Set studentId + status='booked', preserve baseStatus |
| `Slots.delete(slotId)` | `→ void` | Remove single slot |
| `Slots.deleteByUser(uid)` | `→ void` | Remove all slots where teacherId=uid OR studentId=uid |

**Accessed by:**
- `teacher.js` — full CRUD: create availability, set timeout, book for students, cancel, move, delete
- `student.js` — read availability, book/cancel via pending system, move
- `admin.js` — read counts, cascade delete

### 3.3 Recurring

| Function | Signature | Description |
|----------|-----------|-------------|
| `Recurring.all()` | `→ Rule[]` | Read all rules |
| `Recurring.byTeacher(tid)` | `→ Rule[]` | Rules for teacher |
| `Recurring.exists(tid, dayOfWeek, time)` | `→ Rule\|null` | Find exact rule |
| `Recurring.create(tid, dayOfWeek, time)` | `→ void` | Create (skips if exists) |
| `Recurring.delete(recurringId)` | `→ void` | Delete by ID |
| `Recurring.deleteByTeacherDayTime(tid, dow, time)` | `→ void` | Delete specific rule |
| `Recurring.deleteByTeacher(tid)` | `→ void` | Delete all rules for teacher |
| `Recurring.materialiseWeek(tid, weekDates)` | `→ void` | Expand rules into concrete slots for 7 dates |

**Accessed by:**
- `teacher.js` — create/delete rules when toggling availability in week grid
- `student.js` — `materialiseWeek()` to ensure slots exist before checking availability (recurring booking)

### 3.4 Selections

| Function | Signature | Description |
|----------|-----------|-------------|
| `Selections.all()` | `→ Selection[]` | Read all |
| `Selections.byStudent(sid)` | `→ Selection[]` | Student's selected teachers |
| `Selections.byTeacher(tid)` | `→ Selection[]` | Teacher's contacted students |
| `Selections.exists(sid, tid)` | `→ boolean` | Check if relationship exists |
| `Selections.create(sid, tid)` | `→ void` | Create (skips if exists) |
| `Selections.delete(sid, tid)` | `→ void` | Remove specific relationship |
| `Selections.deleteByUser(uid)` | `→ void` | Remove all where studentId=uid OR teacherId=uid |

**Accessed by:**
- `student.js` — `create()` / `delete()` when selecting/deselecting teacher
- `teacher.js` — `byTeacher()` to render "My Students"
- `admin.js` — read counts, cascade delete

---

## 4. Helper Functions

| Function | Location | Description |
|----------|----------|-------------|
| `slotEndTime(time)` | store.js | "14:00" → "14:30" (adds SLOT_DURATION) |
| `slotTimesInRange(start, end)` | store.js | "14:00","16:00" → ["14:00","14:30","15:00","15:30"] |
| `_fmtDate(date)` | store.js | Date object → "YYYY-MM-DD" |
| `_uuid()` | store.js | Generate unique ID |

---

## 5. Pending Changes System (NOT in store.js)

Both `teacher.js` and `student.js` use in-memory pending maps to stage changes before committing:

| Variable | File | Type | Purpose |
|----------|------|------|---------|
| `pendingBookings` | teacher.js | `{slotId: {action, originalSlot, newStudentId}}` | Day panel + All Bookings changes |
| `pendingDayChanges` | student.js | `{slotId: {action, originalSlot, newStudentId}}` | Day slot + My Bookings changes |
| `gridPending` | teacher.js | `{"date\|time": 'available'\|'timeout'\|'disabled'}` | Week grid toggle changes |

**Commit functions:**
- `teacher.js` → `saveBookingChanges()` → iterates pendingBookings, calls `Slots.bookSlot()` / `Slots.cancelBooking()`
- `teacher.js` → `saveGridChanges()` → iterates gridPending, calls `Slots.setAvailability()` / `Slots.create()` / `Recurring.create()` etc.
- `student.js` → `commitDayChanges()` → iterates pendingDayChanges, calls `Slots.bookSlot()` / `Slots.cancelBooking()`

---

## 6. Access Matrix

| Operation | Admin | Teacher | Student |
|-----------|-------|---------|---------|
| Create user | ✅ | ❌ | ❌ |
| Delete user | ✅ | ❌ | ❌ |
| Create/edit slots | ❌ | ✅ (own) | ❌ |
| Set timeout | ❌ | ✅ (own) | ❌ |
| Book slot | ❌ | ✅ (for student) | ✅ (self) |
| Cancel booking | ❌ | ✅ (any own slot) | ✅ (own bookings) |
| Move booking | ❌ | ✅ | ✅ |
| Create recurring rule | ❌ | ✅ | ❌ |
| Select teacher | ❌ | ❌ | ✅ |
| View student list | ❌ | ✅ | ❌ |
| View teacher availability | ❌ | ✅ (own) | ✅ (selected teachers) |

**Note:** Access control is UI-only. There is no server-side enforcement. Any user with developer tools can call any Store function.

---

## 7. Backwards Compatibility

| Item | Description |
|------|-------------|
| `Store.Bookings` | Alias for `Store.Slots` (legacy code) |
| `app_bookings` migration | Old key auto-migrated to `app_slots` on load |
| `baseStatus` migration | Legacy slots without `baseStatus` get it auto-assigned on load |
| `app_session` cleanup | Old session key removed on load |

---

## 8. AUDIT — Redundancies

### 8.1 `Store.Bookings = Slots` (backwards compat alias)
**File:** store.js:315
**Issue:** Dead code. No file references `Store.Bookings`.
**Fix:** Remove the alias.

### 8.2 `Slots.update()` overlaps with `Slots.setAvailability()`, `Slots.bookSlot()`, `Slots.cancelBooking()`
**File:** store.js:167
**Issue:** `update()` is a generic patcher. The three specific functions (`setAvailability`, `bookSlot`, `cancelBooking`) each do `this.all().map(...)` + `_save()` — same pattern as `update()` but with business logic. `update()` is only called once (teacher.js:1488, setting `{status:'timeout'}` without updating `baseStatus`).
**Risk:** That single `update()` call bypasses `baseStatus` logic, creating inconsistency.
**Fix:** Replace that call with `setAvailability(slotId, 'timeout')` and consider removing generic `update()`.

### 8.3 Duplicate `.all()` calls within `byTeacher()`, `byStudent()`, `byTeacherDate()`
**File:** store.js:137-141
**Issue:** `byTeacherDate()` calls `this.byTeacher()` which calls `this.all()`. Each call does `JSON.parse(localStorage.getItem(...))`. On a page with many renders, this parses the entire array repeatedly.
**Scale:** ~43 calls to `all()` across all files.
**Impact:** Low with small datasets (<1000 slots). Could lag with >5000 slots.
**Fix:** Cache per event loop tick, or pass the array as parameter.

### 8.4 `createRange()` calls `exists()` + `create()` in a loop — N+1 problem
**File:** store.js:159-165
**Issue:** For each time slot: `exists()` calls `all()` (full parse), then `create()` calls `all()` again + `_save()`. For a 3-hour range (6 slots): 12 full parses + 6 full writes.
**Fix:** Load once, check in-memory, batch-write at end.

### 8.5 `materialiseWeek()` efficient, but calls `Slots.create()` per rule
**File:** store.js:263-283
**Issue:** Loads `Slots.all()` once for the existence check (good), but each `Slots.create()` re-reads + re-writes the full array.
**Fix:** Batch-create: collect new slots, load once, push all, save once.

---

## 9. AUDIT — Race Conditions

### 9.1 Read-modify-write on shared localStorage
**All CRUD functions**
**Issue:** Pattern is `var data = _load(); /* modify */ _save(data)`. If two browser tabs (e.g. teacher + student) modify simultaneously:
1. Tab A reads: [slot1, slot2]
2. Tab B reads: [slot1, slot2]
3. Tab A writes: [slot1, slot2, slot3]
4. Tab B writes: [slot1, slot2_modified] ← slot3 is lost
**Impact:** Moderate. Two tabs of the same app can corrupt data.
**Fix:** Use `storage` event listener to detect external changes, or implement optimistic locking.

### 9.2 `saveBookingChanges()` / `commitDayChanges()` process pending map sequentially
**File:** teacher.js:1185-1210, student.js:918-932
**Issue:** Each `bookSlot()` / `cancelBooking()` call does a full read-modify-write cycle. If 10 slots are pending, that's 10 sequential full array reads + writes.
**Impact:** Slow with large datasets; no data loss since it's single-threaded.
**Fix:** Batch: load once, apply all changes in memory, save once.

### 9.3 Teacher cancels while student books same slot
**Scenario:** Teacher opens cancel dialog for slot X. Before confirming, student books slot X in another tab. Teacher confirms cancel — student's booking is silently cancelled.
**Impact:** Low in practice (same localStorage = same browser). But possible.

---

## 10. AUDIT — Infinite Loops

### 10.1 `slotTimesInRange()` — SAFE
**File:** store.js:83-97
**Guard:** `if (t >= endTime) break` + `if (h >= 24) break`. Cannot loop infinitely.

### 10.2 Merge loops (`mergeStudentBlocks`, `mergeAllBookingBlocks`, etc.) — SAFE
**All merge functions use `while (j < array.length)` with `j++` increment.** Always terminates.

### 10.3 `materialiseWeek()` — SAFE
**File:** store.js:263-283
**Fixed iteration over `rules` array.** No possibility of infinite loop.

**Verdict: No infinite loops found.**

---

## 11. AUDIT — Memory Leaks

### 11.1 Event listeners in render functions (DOM churn)
**Files:** teacher.js, student.js
**Issue:** Functions like `buildBookingBlock()`, `buildMineBlock()`, `buildAllBookingBlock()` create DOM elements with `addEventListener()` in closures. When the container is cleared with `innerHTML = ''`, the DOM nodes are destroyed but JavaScript closures may retain references to `Store.Slots.all()` results and other data.
**Impact:** Minimal in modern browsers — GC collects unreferenced closures. But if render functions are called very frequently (e.g. on every scroll event), temporary memory spikes could occur.
**Fix:** Acceptable for current scale. For large lists, consider virtual scrolling.

### 11.2 Global scroll/resize listeners — NOT LEAKED
**Files:** teacher.js:2101-2104, student.js:1190-1192
**Analysis:** These are added once at module load, never duplicated. No leak.

### 11.3 Modal ESC listener
**File:** ui.js:77-79
**Issue:** Each `Modal.show()` adds a `keydown` listener to `document`. The listener removes itself on first ESC press. But if the modal is closed by clicking the X or the overlay (not ESC), the listener remains attached forever.
**Impact:** Very minor — each orphaned listener is tiny. But over many modal opens, they accumulate.
**Fix:** Remove the listener in the `close()` function, not just on ESC.

### 11.4 `filterEl.onchange` overwritten on each render
**File:** teacher.js (renderAllBookings)
**Analysis:** `filterEl.onchange = function() {...}` — this replaces the previous handler, not adds to it. No accumulation. NOT a leak.

**Verdict: One minor leak (11.3). No critical leaks.**

---

## 12. Summary

| Category | Count | Severity |
|----------|-------|----------|
| Redundant fields/code | 5 | Low–Medium |
| Race conditions | 3 | Medium (multi-tab only) |
| Infinite loops | 0 | — |
| Memory leaks | 1 (minor) | Low |

**Top priorities to fix:**
1. **`Slots.update()` bypass** (8.2) — can create status/baseStatus inconsistency
2. **`createRange()` N+1** (8.4) — performance issue for large ranges
3. **Modal ESC listener** (11.3) — easy fix, prevents accumulation
4. **Remove `Store.Bookings` alias** (8.1) — dead code cleanup
