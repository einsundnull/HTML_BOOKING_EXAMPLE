# Teacher vs Student — Layout-Vergleich

Ziel: Jede Eigenschaft vergleichen, die die **horizontale Breite** beeinflusst.
Der Teacher hat keinen horizontalen Scroll-Bug. Jede Abweichung ist ein möglicher Verursacher.

---

## 1. CSS-Dateien geladen

| Datei | Teacher | Student | Bemerkung |
|-------|---------|---------|-----------|
| `tokens.css` | ✅ | ✅ | identisch |
| `base.css` | ✅ | ✅ | identisch |
| `components.css` | ✅ | ✅ | identisch |
| `navbar.css` | ✅ | ✅ | identisch |
| `teacher.css` | ✅ | ✅ | ⚠️ **Student lädt teacher.css MIT** |
| `student.css` | ❌ | ✅ | ⚠️ **Nur Student — kann Regeln aus teacher.css überschreiben oder neue einführen** |

**Risiko:** Jede Regel in `student.css`, die einen Selektor aus `teacher.css` neu definiert, kann das Verhalten ändern. Und jeder Selektor in `teacher.css`, der auch in student.html matched, wird angewandt.

---

## 2. HTML-Grundstruktur

| Ebene | Teacher | Student | Diff? |
|-------|---------|---------|-------|
| `<html>` | keine extra Klasse | keine extra Klasse | ✅ gleich |
| `<body>` | direkt | direkt | ✅ gleich |
| `.app-shell` | ✅ wraps `<main>` | ✅ wraps `<main>` | ✅ gleich |
| `<main class="page">` | ✅ | ✅ | ✅ gleich |
| Overlay außerhalb `.app-shell` | `#slot-grid-overlay` | `#student-grid-overlay` | ✅ beide `position:fixed; inset:0` |
| FAB außerhalb `.app-shell` | `#booking-fab-group` | `#day-save-group` | ✅ beide `position:fixed; left:50%; transform:translateX(-50%)` |
| Section-Jumper | `#section-jumper` | `#section-jumper` | ✅ gleich |

---

## 3. Haupt-Grid-Layout (Kalender + rechte Spalte)

| Eigenschaft | Teacher `.teacher-layout` | Student `.student-cal-layout` | ⚠️ Diff |
|-------------|--------------------------|-------------------------------|---------|
| `display` | `grid` | `grid` | ✅ |
| `grid-template-columns` | **`264px 1fr`** | **`minmax(0, 280px) minmax(0, 1fr)`** | ⚠️ **UNTERSCHIED** |
| `gap` | `var(--sp-4)` = 24px | `var(--sp-4)` = 24px | ✅ |
| `align-items` | `start` | `start` | ✅ |
| `width` | `100%` | `100%` | ✅ |
| `min-width` | `0` | `0` | ✅ |
| `@media ≤700px` | `1fr` (single column) | `1fr` (single column) | ✅ |

**Analyse:** Teacher nutzt feste `264px` für die linke Spalte und `1fr` für rechts. Student nutzt `minmax(0, 280px)` + `minmax(0, 1fr)`. Im Prinzip sollte `minmax(0, ...)` sicherer sein als eine feste Breite, da es die Spalte auf 0 schrumpfen lässt. **Kein Overflow-Risiko hier.** Auf mobil (≤700px) sind beide identisch `1fr`.

---

## 4. Rechte Spalte (Day-Panel / Day-Slots)

| Eigenschaft | Teacher `#section-daypanel` | Student `#day-slots-wrapper` | ⚠️ Diff |
|-------------|----------------------------|------------------------------|---------|
| `min-width` | `0` | `0` | ✅ |
| `display` | `flex` | `flex` | ✅ |
| `flex-direction` | `column` | `column` | ✅ |
| Kind-Element `.card` | `flex: 1; min-width: 0` | ❌ **kein `.card` Wrapper um `#day-slots`** | ⚠️ **UNTERSCHIED** |

**Analyse:** Teacher wickelt den Day-Panel-Inhalt in eine `.card` mit `flex: 1; min-width: 0`. Student hat `#day-slots` direkt in `#day-slots-wrapper` ohne diesen Extra-Wrapper. Die `.card` in `components.css` hat `min-width: 0`, was Overflow-Schutz bietet.

---

## 5. Day-Nav-Bar (Sticky Navigation)

| Eigenschaft | Teacher | Student | Diff? |
|-------------|---------|---------|-------|
| Klasse | `.day-nav-bar` | `.day-nav-bar` | ✅ gleich |
| `width` | `100%` | `100%` | ✅ |
| `padding` | `var(--sp-2) var(--container-pad)` | `var(--sp-2) var(--container-pad)` | ✅ |
| `box-sizing` | `border-box` | `border-box` | ✅ |
| Sticky: `position` | `fixed` | `fixed` | ✅ |
| Sticky: `left` | `0` | `0` | ✅ |
| Sticky: `right` | `0` | `0` | ✅ |
| Sticky: `top` | `52px` | `52px` | ✅ |

**Analyse:** Identisch. Kein Unterschied.

---

## 6. Slot-Rows (Inhalt der rechten Spalte)

| Eigenschaft | Teacher `.slot-card` | Student `.day-slot-row` | ⚠️ Diff |
|-------------|---------------------|------------------------|---------|
| Container-Typ | `.slot-card` (eigene Karten) | `.day-slot-row` (flache Zeilen) | ⚠️ anderes Konzept |
| `display` | `flex; flex-direction: column` | `flex` (row, default) | ⚠️ |
| `min-width` | `0` | `0` | ✅ |
| `overflow` | **`hidden`** | ❌ **nicht gesetzt** | ⚠️ **UNTERSCHIED** |
| `box-sizing` | implizit border-box (global reset) | implizit border-box | ✅ |

**Analyse:** Teacher `.slot-card` hat `overflow: hidden` — alles was überläuft wird abgeschnitten. Student `.day-slot-row` hat **kein `overflow: hidden`**, daher können Kinder überlaufen.

---

## 7. Slot-Card vs Day-Slots-Card Wrapper

| Eigenschaft | Teacher (kein extra Wrapper nötig) | Student `.day-slots-card` | Bemerkung |
|-------------|-----------------------------------|--------------------------|-----------|
| `width` | n/a | `100%` | ✅ |
| `box-sizing` | n/a | `border-box` | ✅ |
| `overflow` | n/a | **`hidden`** | ✅ vorhanden |
| `min-width` | n/a | `0` | ✅ |

**Analyse:** `.day-slots-card` hat `overflow: hidden`, was den Inhalt clippen sollte. Aber `.day-slots-card` wird von `renderDaySlots()` in JS erzeugt — es muss geprüft werden, ob **alle** Inhalte innerhalb von `.day-slots-card` landen.

---

## 8. Zeitlabel-Darstellung

| Eigenschaft | Teacher `.slot-card-time` | Student `.day-slot-time` | ⚠️ Diff |
|-------------|--------------------------|--------------------------|---------|
| `font-family` | `monospace` | `monospace` | ✅ |
| `font-size` | `var(--text-caption)` | `var(--text-caption)` | ✅ |
| `white-space` | ❌ **nicht gesetzt** | **`nowrap`** | ⚠️ **UNTERSCHIED** |
| `flex` | ❌ nicht gesetzt | **`1`** | ⚠️ **UNTERSCHIED** |
| `min-width` | ❌ nicht gesetzt | **`0`** | Student hat es ✅ |
| `overflow` | ❌ nicht gesetzt | ❌ **nicht gesetzt** | ⚠️ **BEIDE FEHLT** |

**Analyse:** Student `.day-slot-time` hat `white-space: nowrap` + `flex: 1` + `min-width: 0`. Das `min-width: 0` erlaubt Schrumpfen, aber **ohne `overflow: hidden` kann der Text trotzdem über das Elternelement hinausragen**, wenn der Flex-Container selbst keinen Overflow-Clip hat. Teacher hat `white-space` gar nicht gesetzt auf der Zeitangabe — der Text kann also natürlich umbrechen.

---

## 9. Button-Darstellung in Slot-Rows

| Eigenschaft | Teacher (Buttons in `.slot-card-actions`) | Student (Button direkt in `.day-slot-row`) | ⚠️ Diff |
|-------------|------------------------------------------|-------------------------------------------|---------|
| `.btn` `white-space` | `nowrap` | `nowrap` | ✅ gleich |
| Container | `.slot-card-actions` mit `flex-shrink: 0` | direkt im `.day-slot-row` | ⚠️ |
| Row `overflow` | Parent `.slot-card` hat `overflow: hidden` | `.day-slot-row` hat **kein** `overflow` | ⚠️ **UNTERSCHIED** |

---

## 10. Kalender-Grid (Weekdays / Days)

| Eigenschaft | Teacher | Student | ⚠️ Diff |
|-------------|---------|---------|---------|
| `.cal-weekdays` columns | `repeat(7, 1fr)` | `repeat(7, minmax(0, 1fr))` | ⚠️ klein |
| `.cal-days` columns | `repeat(7, 1fr)` | `repeat(7, minmax(0, 1fr))` | ⚠️ klein |

**Analyse:** Student nutzt `minmax(0, 1fr)` statt `1fr`. Das ist eigentlich **besser** gegen Overflow, da `minmax(0, 1fr)` die minimale Spaltenbreite auf 0 setzt, während `1fr` die `min-content`-Breite als Minimum nimmt. **Kein Bug-Verursacher.**

---

## 11. View-Nav (Tab-Buttons)

| Eigenschaft | Teacher (in `teacher.css`) | Student (in `student.css`) | ⚠️ Diff |
|-------------|---------------------------|---------------------------|---------|
| `display` | `flex` | `flex` | ✅ |
| `flex-wrap` | ❌ nicht gesetzt | **`wrap`** | ⚠️ Student fügt `wrap` hinzu |

**Analyse:** Student hat `flex-wrap: wrap` — das ist eine Verbesserung, kein Bug-Verursacher.

---

## 12. Catalog-Grid (nur Student)

| Eigenschaft | Student `.catalog-grid` | Teacher | Bemerkung |
|-------------|------------------------|---------|-----------|
| `grid-template-columns` | `repeat(auto-fill, minmax(240px, 1fr))` | existiert nicht | ⚠️ **NUR STUDENT** |

**Analyse:** Auf Screens schmaler als ~260px kann `minmax(240px, 1fr)` nicht wrappen und überläuft. Aber das ist die Katalog-View, nicht die Day-Slot-View aus dem Screenshot. **Trotzdem: wenn die Katalog-View im DOM existiert (nur `display:none` via `.view-hidden`), kann sie auf manchen Browsern den Scroll-Container verbreitern.**

---

## 13. `overflow-x` auf `html` und `body`

| Eigenschaft | Aktueller Stand | Empfehlung |
|-------------|----------------|------------|
| `html` `overflow-x` | ❌ **nicht gesetzt** | ⚠️ **Muss `hidden` sein für Android Chrome** |
| `body` `overflow-x` | `hidden` | ✅ vorhanden |
| `html, body` `max-width` | `100%` | ✅ vorhanden |

**Analyse:** Auf Android Chrome ist `html` (nicht `body`) der horizontale Scroll-Container. `overflow-x: hidden` nur auf `body` ist **unzureichend**.

---

## 14. Student-Grid-Overlay (Extra Regeln in student.css)

| Eigenschaft | Teacher `#slot-grid-overlay` | Student `#student-grid-overlay` | Diff? |
|-------------|-----------------------------|---------------------------------|-------|
| Base: `position: fixed; inset: 0` | ✅ | ✅ | ✅ |
| Base: `overflow: hidden` | ✅ | ✅ | ✅ |
| Base: `max-width: 100vw` | ✅ | ✅ | ✅ |
| Extra: `overflow: hidden` | ❌ (nicht nochmal) | ✅ (in `student.css`) | Student hat Extra-Schutz |
| `.grid-topbar` Extra | ❌ | `flex-wrap: nowrap; overflow: hidden; max-width: 100vw` | Student hat Extra-Schutz |

**Analyse:** Student hat sogar **mehr** Overflow-Schutz auf dem Overlay als Teacher. Kein Bug-Verursacher.

---

## Zusammenfassung: Verdächtige Unterschiede

| # | Was | Teacher | Student | Risiko |
|---|-----|---------|---------|--------|
| **A** | `html` `overflow-x` | nicht gesetzt (braucht es auch nicht, da kein Overflow) | **nicht gesetzt — aber es gibt Overflow** | 🔴 **HOCH — Quick-Fix** |
| **B** | `.slot-card` / `.day-slot-row` `overflow` | `hidden` auf `.slot-card` | **fehlt** auf `.day-slot-row` | 🔴 **HOCH** |
| **C** | `.day-slot-time` `white-space` | nicht gesetzt (kann wrappen) | `nowrap` (kann nicht wrappen) | 🟡 **MITTEL** |
| **D** | `.day-slot-time` `overflow` | nicht relevant (wraps natürlich) | **fehlt** (nowrap + kein overflow = kann überlaufen) | 🟡 **MITTEL** |
| **E** | `.card` Wrapper um Day-Panel-Inhalt | vorhanden (`flex:1; min-width:0`) | fehlt (kein `.card` um `#day-slots`) | 🟡 **MITTEL** |
| **F** | `.catalog-grid` `minmax(240px, ...)` | existiert nicht | vorhanden, auch wenn `display:none` | 🟡 **MITTEL** |

---

## Empfohlene Fix-Reihenfolge

**Fix 1 — Sofort (A):** `overflow-x: hidden` auf `html` in `base.css`
```css
html, body { max-width: 100%; overflow-x: hidden; }
```

**Fix 2 — Strukturell (B + D):** `overflow: hidden` auf `.day-slot-row` + `overflow: hidden; text-overflow: ellipsis` auf `.day-slot-time`
```css
.day-slot-row { overflow: hidden; }
.day-slot-time { overflow: hidden; text-overflow: ellipsis; }
```

**Fix 3 — Sicherheitsnetz (F):** `.catalog-grid` minimale Spaltenbreite auf etwas Mobilfreundliches senken
```css
.catalog-grid { grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)); }
```

Fix 1 ist der Pflaster-Fix (verhindert den sichtbaren Scroll). Fix 2 + 3 beheben die eigentliche Ursache.
