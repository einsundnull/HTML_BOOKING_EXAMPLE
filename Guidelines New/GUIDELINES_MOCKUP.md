# MOCKUP_GUIDELINES — Verbindliche Richtlinien für alle Mockups
*Lies diese Datei vor jedem Mockup. Keine Ausnahmen.*
*Erstellt: 2026-03-23*

---

## 1. Zweck

Mockups sind statische HTML-Dateien, die ein spezifisches UI-Element 1:1 visuell abbilden.
Sie dienen als Referenz vor der Implementierung und als Dokumentation danach.

---

## 2. Dateiname — Pflichtformat

```
mockup-{ElementName}-{YYYY-MM-DD}_{HH-MM}.html
```

**Beispiele:**
- `mockup-buildBookingForm-2026-03-23_20-03.html`
- `mockup-_tdvBuildRowV2-2026-03-23_15-30.html`
- `mockup-renderDayPanel-availabilityTab-2026-03-23_11-00.html`

**Regeln:**
- Prefix immer `mockup-`
- ElementName = exakter Funktions- oder Komponentenname aus dem Code
- Datum + Uhrzeit immer anhängen (ISO-Format)
- Immer `.html`

---

## 3. Pflicht-Kommentar im `<head>`

Jedes Mockup muss einen Kommentar enthalten, der den Pfad zur implementierten Stelle eindeutig beschreibt:

```html
<!--
  MOCKUP: {FunctionName}
  FILE:   {filename.js} : line {N} — {function signature}
  CSS:    {filename.css} — {relevant class names}
  CHANGE: {Was wird geändert / hinzugefügt}
  DATE:   {YYYY-MM-DD HH:MM}
-->
```

**Beispiel:**
```html
<!--
  MOCKUP: buildBookingForm
  FILE:   teacher.js : line 761 — function buildBookingForm(startSlot, dateStr, allSlots)
  CSS:    teacher.css — .booking-form-label, .booking-form-students,
                        .booking-form-check-row, .booking-form-checkbox
  CHANGE: Already-booked students greyed out with badge
          New CSS class: .booking-form-check-row--booked
          New CSS class: .booking-form-already-badge
  DATE:   2026-03-23 20:03
-->
```

---

## 4. CSS — Pflichtregeln

1. **Alle CSS inline im `<style>` Tag** — keine externen Stylesheets
2. **Tokens 1:1 aus `tokens.css` kopieren** — keine eigenen Werte erfinden
3. **Bestehende Klassen 1:1 aus dem jeweiligen CSS kopieren** — exakt wie im Code
4. **Neue Klassen** am Ende des `<style>` Blocks, mit Kommentar wo sie im echten CSS hingehören:
   ```css
   /* ── NEW: teacher.css — append after .booking-form-check-row ── */
   .booking-form-check-row--booked { ... }
   ```
5. **Keine inline styles** — alle Werte in Klassen
6. **Font immer einbinden:**
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&amp;display=swap" rel="stylesheet">
   ```

---

## 5. Inhalt — Pflichtregeln

1. **Alle relevanten States zeigen** — z.B. State A (leer), State B (gefüllt), State C (Fehler)
2. **States nebeneinander** — nicht übereinander, damit direkter Vergleich möglich
3. **State-Label** über jedem State (klein, grau, uppercase)
4. **Realistische Dummy-Daten** — echte Namen (s1, s2), echte Zeitwerte (14:00), echte Preise (€45,00)
5. **Interaktivität optional** — Mockup darf statisch sein; wenn JS, dann nur für Toggle-Demo

---

## 6. Was ein Mockup NICHT ist

- Kein Prototyp mit echter Logik
- Kein Test
- Kein Dokumentations-Ersatz für den Code selbst
- Keine finale Implementierung

---

## 7. Speicherort

Mockups werden in zwei Orten gespeichert:
- **`/mnt/user-data/outputs/`** — für den Download durch den User
- **`/home/claude/project/HTML/Doc/mockups/`** — als dauerhafte Projekt-Dokumentation (Kopie)

---

## 8. Checkliste vor Abgabe

- [ ] Dateiname folgt dem Format `mockup-{ElementName}-{YYYY-MM-DD}_{HH-MM}.html`
- [ ] Pflicht-Kommentar im `<head>` mit FILE, CSS, CHANGE, DATE
- [ ] Alle CSS-Tokens aus `tokens.css` korrekt eingebunden
- [ ] Bestehende CSS-Klassen 1:1 aus dem echten Code kopiert
- [ ] Neue CSS-Klassen mit Kommentar "wo im echten CSS hingehören"
- [ ] Mindestens 2 States gezeigt (vorher / nachher)
- [ ] Realistische Dummy-Daten
- [ ] Datei in `/mnt/user-data/outputs/` abgelegt

---

## 9. Reihenfolge: Mockup vor Code

> **Erst Mockup erstellen, vom User freigeben lassen, dann implementieren.**

Kein Code ohne vorheriges Mockup bei UI-Änderungen.
Der User muss explizit "implementieren" oder "okay" sagen, bevor Code geschrieben wird.
