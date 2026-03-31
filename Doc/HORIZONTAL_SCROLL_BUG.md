# Horizontal Scroll Bug — Summary for Next LLM

## The Symptom
On **student.html** (mobile), the page scrolls horizontally to the right.
The content (time labels + "Book" buttons in the day slot list) is cut off on the LEFT — meaning the user has scrolled right and there is extra space to the right of the visible viewport.

This does NOT happen on **teacher.html**. Teacher works correctly.

Screenshot shows: the day slot list view (`.day-slot-row` items with time + Book button) is the active view when overflow occurs.

---

## File Locations
```
/home/claude/project/HTML/
  student.html
  teacher.html
  css/base.css         ← shared, affects both pages
  css/teacher.css      ← loaded by BOTH teacher.html AND student.html
  css/student.css      ← only loaded by student.html
  js/student.js
  js/teacher.js
```

---

## What Has Been Tried (All Failed)

### Attempt 1 — `min-width: 0` on day-slots wrapper
Added to `student.css`:
```css
#day-slots-wrapper { min-width: 0; display: flex; flex-direction: column; }
.day-slots-card { ... min-width: 0; }
```
**Result:** Did not fix it.

### Attempt 2 — `overflow-x: hidden` on `body`
Added to `base.css`:
```css
body { overflow-x: hidden; }
```
**Result:** Did not fix it. (On Android Chrome, the scroll container is `html`, not `body`, so `overflow-x:hidden` on body alone is ineffective.)

### Attempt 3 — `left: 0; right: 0` on `.day-nav-bar.is-sticky`
The day-nav-bar uses `position: fixed` with `width: 100%` but had no `left` value.
`left` would default to the in-flow position (= page padding = 32px), making the bar overflow 32px to the right.

Added to `base.css`:
```css
.day-nav-bar.is-sticky {
  position: fixed;
  top: 52px;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 90;
  border-radius: 0;
}
```
**Result:** Did not fix it.

---

## Key Structural Differences: Teacher vs Student

### CSS loaded
| File | Teacher | Student |
|------|---------|---------|
| `base.css` | ✓ | ✓ |
| `components.css` | ✓ | ✓ |
| `navbar.css` | ✓ | ✓ |
| `teacher.css` | ✓ | ✓ (also loaded!) |
| `student.css` | ✗ | ✓ |

Student loads **teacher.css + student.css**. Any rule in teacher.css that matches a student HTML element applies.

### HTML layout wrapper
| | Teacher | Student |
|---|---------|---------|
| Layout class | `.teacher-layout` (in `teacher.css`) | `.student-cal-layout` (in `student.css`) |
| Layout CSS | `grid; 264px 1fr; min-width:0; width:100%` | `grid; minmax(0,280px) minmax(0,1fr); width:100%; min-width:0` |
| Right column | `#section-daypanel` — has `min-width:0` in `teacher.css` | `#day-slots-wrapper` — gets `min-width:0` from recent fix |

### What the student page renders in the right column
The right column of `.student-cal-layout` contains `#day-slots-wrapper`, which holds:
- `#day-nav-bar` (the sticky nav bar with prev/next day buttons)
- `#day-slots` (rendered by `renderDaySlots()` in `student.js`)

`renderDaySlots()` produces `.day-slots-card > .day-slot-list > .day-slot-row` elements.
Each `.day-slot-row` is a flex row: `justify-content: space-between` with a time `<span>` + a `.btn.btn-primary.btn-sm` "Book" button.

The `.btn` class has `white-space: nowrap` — it will never wrap.

---

## Suspects Not Yet Eliminated

### 1. `catalog-grid` overflow
```css
.catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
```
On screens narrower than ~260px this won't wrap and will overflow. But this is the catalog view, not the day slot view shown in the screenshot.

### 2. The `day-nav-bar` itself when NOT sticky
Even when not sticky, `.day-nav-bar` has `width: 100%` and `padding: var(--sp-2) var(--container-pad)`. If `#day-slots-wrapper` is somehow wider than the grid column, the bar inherits that width. This may cascade even with `min-width:0` on the wrapper.

### 3. `overflow-x: hidden` not on `html`
On Android Chrome (which is what the screenshot shows — Android nav buttons visible), the actual scroll container for horizontal scroll is typically `html`, not `body`. Adding `overflow-x: hidden` to `body` alone may not suppress it. The correct cross-platform fix is on `html`, but conventionally people avoid this because of a myth about `position:fixed` breaking — **this myth is wrong**. `overflow:hidden` on `html` does NOT break `position:fixed` in modern browsers. What breaks `position:fixed` is `transform`, `filter`, or `will-change:transform` on an ancestor. Neither `html` nor `body` in this project has any of those.

**Recommended next step:** Add `overflow-x: hidden` to BOTH `html` AND `body` in `base.css`:
```css
html, body { max-width: 100%; overflow-x: hidden; }
```

### 4. Something rendered by JS wider than viewport
The JS renders `.day-slot-row` items dynamically. The time label format is e.g. `"13:30 – 14:00"` (monospace font, `white-space: nowrap`). Combined with the Book button, the total row width on very small screens could exceed the column width if the column itself has no hard pixel cap. Need to verify `.day-slot-time` has `min-width:0` or `overflow:hidden`.

### 5. `#student-grid-overlay` or `#day-save-group` outside app-shell
Both the overlay and the FAB group are direct children of `<body>`, outside `.app-shell`. If either has a width wider than the viewport (e.g. FAB group uses `left: 50%; transform: translateX(-50%)` which is fine, but the overlay uses `position:fixed; inset:0` which is also fine). These are unlikely causes but should be verified.

---

## Current State of `base.css` (relevant sections)
```css
html { font-size: 16px; -webkit-text-size-adjust: 100%; }
html, body { max-width: 100%; }
body { overflow-x: hidden; }   /* ← added, but insufficient on Android */

.page {
  flex: 1;
  padding: var(--sp-6) var(--container-pad);   /* container-pad = 32px desktop, 16px ≤768px */
  max-width: var(--container-max);   /* 1280px */
  margin: 0 auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.day-nav-bar.is-sticky {
  position: fixed;
  top: 52px;
  left: 0;       /* ← added */
  right: 0;      /* ← added */
  width: 100%;
  z-index: 90;
  border-radius: 0;
}
```

## Current State of `student.css` (relevant sections)
```css
.student-cal-layout {
  display: grid;
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  gap: var(--sp-4);
  align-items: start;
  width: 100%;
  min-width: 0;
}
@media (max-width: 700px) {
  .student-cal-layout { grid-template-columns: 1fr; }
}

.day-slots-card    { width: 100%; box-sizing: border-box; overflow: hidden; min-width: 0; }
.day-slot-list     { display: flex; flex-direction: column; gap: var(--sp-2); }
.day-slot-row      { display: flex; align-items: center; justify-content: space-between;
                     padding: var(--sp-2) 0; border-bottom: 1px solid var(--neutral-100);
                     gap: var(--sp-2); min-height: 40px; min-width: 0; }

#day-slots-wrapper {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
```
