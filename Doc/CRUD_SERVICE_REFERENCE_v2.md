# Booking System — Complete Data Model & Audit (v2)

Basierend auf dem aktuellen Stand aller Dateien (16 JS, 12 HTML, 11 CSS).

---

## 1. localStorage Keys (komplett)

| Key | Typ | Datei | Beschreibung |
|-----|-----|-------|-------------|
| `app_users` | Array | store.js | Alle User (teacher/student/admin) |
| `app_slots` | Array | store.js | Kalender-Slots (verfügbar/gebucht/timeout/disabled) |
| `app_recurring` | Array | store.js | Wiederkehrende Verfügbarkeitsregeln |
| `app_selections` | Array | store.js | Student↔Teacher-Kontaktbeziehungen |
| `app_profiles` | Object | profile.js | Profildaten (Foto, Bio, Zertifikate, Preise, etc.) |
| `app_chat_messages` | Array | chat.js | Chat-Nachrichten + Service-Messages + Booking-Proposals |
| `app_email_log` | Array | email.js | E-Mail-Versandprotokoll (Mock + Live) |

---

## 2. Entitäten

### 2.1 User (store.js)
```
{ uid, name, role, discipline, email }
discipline: "ski" | "snowboard" | "telemark" | "nordic" | "" (nur für role=teacher)
```

### 2.2 Slot (store.js)
```
{ slotId, teacherId, studentId|null, date, time, status, baseStatus }
```
Status-Layer: `baseStatus` (available|disabled|timeout) → `status` (= baseStatus, oder 'booked')

### 2.3 Recurring Rule (store.js)
```
{ recurringId, teacherId, dayOfWeek (0=Mo…6=So), time }
```

### 2.4 Selection (store.js)
```
{ studentId, teacherId }
```

### 2.5 Profile (profile.js)
```
{ uid, name, age, gender, location, bio, photo (base64),
  pricePerHalfHour, experienceYears, languages[], lessonTypes[],
  audience[], ageFrom, ageTo, levels[], maxGroupSize,
  terrain[], certifications[], specializations[],
  email, emailVisible, phone, phoneVisible, instagram, website,
  updatedAt }
```

### 2.6 ChatMessage (chat.js)
```
{ msgId, conversationKey, senderId, receiverId, text, type,
  readStatus, edited, deleted, createdAt }
```
Subtypen:
- `type: 'text'` — normale Nachricht
- `type: 'booking_proposal'` — + `bookingData`, `bookingStatus`
- `type: 'service'` — + `isService`, `serviceEvent`, `requestStatus`, `teacherId`, `studentId`
- `serviceEvent: 'student_disconnected'` — + `cancelledSlots[]`

### 2.7 EmailLog (email.js)
```
{ id, event, to, toName, subject, timestamp, status, error? }
```

---

## 3. CRUD-Funktionen pro Store

### Store (store.js) — Users, Slots, Recurring, Selections
_(Unverändert gegenüber vorheriger Doku — 4 Sub-Stores mit je all/create/delete/query)_

### ProfileStore (profile.js)
| Funktion | Beschreibung |
|----------|-------------|
| `get(uid)` | Profil laden oder null |
| `save(uid, data)` | Profil speichern (setzt updatedAt) |
| `getDefault(uid)` | Leeres Profil mit Name aus Store.Users |
| `getOrDefault(uid)` | get() || getDefault() |
| `getDisplayName(uid)` | Profil-Name > Store-Name > uid |
| `getPhoto(uid)` | Foto-base64 oder null |
| `getPrice(uid)` | Preis oder null |
| `getSpecializations(uid)` | Spezialisierungen oder [] |

### ChatStore (chat.js)
| Funktion | Beschreibung |
|----------|-------------|
| `getConversation(A, B)` | Alle Nachrichten zwischen zwei Usern |
| `getLastMessage(A, B)` | Letzte Nachricht |
| `countUnread(me, partner)` | Ungelesene Nachrichten |
| `totalUnread(me)` | Gesamt ungelesene über alle Konversationen |
| `send(from, to, text, type)` | Nachricht senden |
| `sendBookingProposal(from, to, data)` | Terminvorschlag |
| `sendServiceMessage(teacher, student, event)` | System-Nachricht |
| `sendDisconnectMessage(teacher, student, slots)` | Trennungs-Nachricht |
| `respondServiceRequest(msgId, response, t, s)` | Anfrage beantworten |
| `respondBooking(msgId, response)` | Buchungsvorschlag beantworten |
| `getRequestStatus(teacher, student)` | Status der Schüleranfrage |
| `hasConversation(A, B)` | Hat Konversation? |
| `markAsRead(me, partner)` | Als gelesen markieren |
| `markAsDelivered(me, partner)` | Als zugestellt markieren |
| `deleteMsg(msgId)` | Soft-Delete (text='', deleted=true) |
| `editMsg(msgId, text)` | Nachricht bearbeiten |
| `seedDemoMessages(me, partner)` | Demo-Daten einfügen |

### EmailService (email.js)
| Funktion | Beschreibung |
|----------|-------------|
| `send({toUid, event, vars})` | E-Mail senden (Mock oder Mailgun) |
| `getLog()` | Versandprotokoll |
| `clearLog()` | Protokoll löschen |
| `EVENTS.*` | Definierte E-Mail-Typen |

---

## 4. Datei-Zugriffs-Matrix

| Datei | Store.Users | Store.Slots | Store.Recurring | Store.Selections | ProfileStore | ChatStore | EmailService |
|-------|:-----------:|:-----------:|:---------------:|:----------------:|:------------:|:---------:|:------------:|
| store.js | DEF | DEF | DEF | DEF | — | — | — |
| auth.js | R | — | — | — | — | — | — |
| admin.js | CRUD | R | — | R | — | — | — |
| teacher.js | R | CRUD | CRUD | R | — | — | — |
| student.js | R | R/Book/Cancel | R (materialise) | CRUD | — | — | — |
| profile.js | R | — | — | — | CRUD | — | — |
| chat.js | R | — | — | D | — | CRUD | — |
| email.js | R | — | — | — | R (name) | — | CRUD |
| navbar.js | R | — | — | — | R (name,photo) | R (unread) | — |
| skiing-catalog.js | R | — | — | — | R | — | — |
| landing.js | — | — | — | — | — | — | — |
| skiing.js | — | — | — | — | — | — | — |
| ui.js | — | R | R (materialise) | — | — | — | — |

---

## 5. AUDIT — Redundanzen

### R1. `_uuid()` — 3× identisch implementiert
| Datei | Zeile |
|-------|-------|
| store.js | 34 |
| chat.js | 99 |
| email.js | 109 |
**Fix:** Einmal in store.js definieren, global exportieren.

### R2. `_now()` — 2× identisch implementiert
| Datei | Zeile |
|-------|-------|
| chat.js | 104 |
| email.js | 105 |
**Fix:** Einmal zentral definieren.

### R3. `_load()` / `_save()` — 3 separate Implementierungen
| Datei | Key | Typ |
|-------|-----|-----|
| store.js | parametrisiert | Array |
| profile.js | `app_profiles` | Object |
| chat.js | `app_chat_messages` | Array |
**Analyse:** Bewusst getrennt (verschiedene Keys/Typen). Kein Fix nötig, aber bei Migration zu Firebase wird das zu einem einzigen SDK-Call.

### R4. Doppelte Namensquelle — `Store.Users.name` vs `ProfileStore.name`
**Problem:** `student.js` nutzt `Store.Users.byUid(tid).name` direkt. `chat.js`, `email.js`, `navbar.js` nutzen `ProfileStore.getDisplayName(uid)`. Wenn ein User seinen Profilnamen ändert, zeigt student.js noch den alten Store-Namen.
**Betroffene Stellen in student.js:**
- Zeile 192: Teacher-Card Name
- Zeile 243, 250: Toast bei Select/Deselect
- Zeile 298: Teacher-Picker Dropdown
- Zeile 523: Grid-Overlay Teacher-Name
**Fix:** Überall `ProfileStore.getDisplayName(uid)` verwenden.

### R5. `Store.Bookings = Slots` — Toter Code
**Datei:** store.js:315
**Fix:** Entfernen.

### R6. `Slots.update()` umgeht baseStatus-Logik
**Datei:** store.js:167, aufgerufen in teacher.js (1× mit `{status:'timeout'}`)
**Problem:** Setzt `status` ohne `baseStatus` zu aktualisieren → Inkonsistenz.
**Fix:** Durch `setAvailability(slotId, 'timeout')` ersetzen.

### R7. `createRange()` N+1 Problem
**Datei:** store.js:159-165
**Problem:** Pro Slot: `exists()` parst gesamtes Array + `create()` parst+schreibt gesamtes Array.
**Fix:** Load once, check in-memory, batch-write.

### R8. `materialiseWeek()` ruft `Slots.create()` pro Regel
**Datei:** store.js:263-283
**Problem:** Liest einmal (gut), aber jeder `create()` liest+schreibt nochmal.
**Fix:** Batch-create.

---

## 6. AUDIT — Race Conditions

### RC1. Multi-Tab Read-Modify-Write
**Alle Stores** (store.js, chat.js, profile.js)
**Szenario:** Tab A liest → Tab B liest → Tab B schreibt → Tab A schreibt → Tab B's Änderung verloren.
**Reales Risiko:** Hoch — Teacher und Student werden routinemäßig in getrennten Tabs getestet.
**Fix (localStorage):** `window.addEventListener('storage', callback)` — bei externer Änderung UI neu rendern.
**Fix (Firebase):** `onSnapshot()` ersetzt das Problem komplett.

### RC2. Sequentielle Commits in saveBookingChanges/commitDayChanges
**Dateien:** teacher.js, student.js
**Problem:** 10 pending Changes = 10× read-modify-write.
**Fix:** Batch: einmal laden, alle Änderungen anwenden, einmal speichern.

### RC3. Teacher cancelt während Student bucht (anderer Tab)
**Risiko:** Niedrig in Produktion (Firebase hat Transactions), aber möglich mit localStorage.

---

## 7. AUDIT — Infinite Loops

**Ergebnis: Keine gefunden.**

Alle Schleifen in allen 16 JS-Dateien verwenden:
- `for (var i = 0; i < array.length; i++)` — terminiert immer
- `while (j < array.length)` mit `j++` — terminiert immer
- `slotTimesInRange()` — doppelter Guard (`>= endTime` + `h >= 24`)

---

## 8. AUDIT — Memory Leaks

### ML1. Modal ESC-Listener akkumuliert
**Datei:** ui.js:77-78
**Problem:** `close()` (Zeile 73) entfernt nur das DOM-Element. Der `keydown`-Listener auf `document` wird nur bei ESC-Press entfernt, nicht bei X-Klick oder Overlay-Klick.
**Impact:** Jedes Modal-Öffnen (+X-Schließen) hinterlässt einen verwaisten Listener.
**Fix:**
```javascript
function close() {
  overlay.remove();
  document.removeEventListener('keydown', esc);
}
```

### ML2. ProfileEdit `visualViewport` Listener
**Datei:** profile.js:938-939
**Problem:** `window.visualViewport.addEventListener('resize', _reposition)` wird bei jedem Dropdown-Öffnen registriert. Wird beim Schließen entfernt? Muss geprüft werden.
**Impact:** Gering — visualViewport-Listener sind leichtgewichtig.

### ML3. Mehrfache `window.addEventListener('scroll', ...)` — KEIN Leak
**Dateien:** teacher.js, student.js, profile.js, skiing-catalog.js, landing.js, skiing.js
**Analyse:** Alle werden einmal bei Modulstart registriert. Keine Akkumulation. **Kein Problem.**

---

## 9. Zusammenfassung

| Kategorie | Anzahl | Schweregrad |
|-----------|--------|-------------|
| Redundanzen | 8 | R4 (Namensquelle) + R6 (update bypass) = Mittel, Rest = Niedrig |
| Race Conditions | 3 | RC1 = Hoch (Multi-Tab), Rest = Mittel |
| Infinite Loops | 0 | — |
| Memory Leaks | 2 | ML1 = Niedrig (einfacher Fix), ML2 = Sehr niedrig |

### Top-Prioritäten:

1. **R4 — Doppelte Namensquelle** → `ProfileStore.getDisplayName()` überall verwenden
2. **RC1 — Multi-Tab Race Condition** → `storage`-Event-Listener als Zwischenlösung
3. **R6 — `Slots.update()` bypass** → durch `setAvailability()` ersetzen
4. **ML1 — Modal ESC Listener** → `close()` muss Listener entfernen
5. **R1 — 3× `_uuid()`** → einmal zentral definieren

---

## 10. Escrow & Deposit-System (NEU)

> Hinzugefügt: 2026-03-12
> Implementierungsplan: vollständig abgestimmt, Schritt 1 von 8.

---

### 10.1 Übersicht

Das Escrow-System dient als **Trollschutz** und optionaler Zahlungsfluss zwischen Student und Teacher.
Ein Deposit wird beim Buchen einbehalten und erst nach Stundenbestätigung durch den Schüler freigegeben.
Der Teacher entscheidet im Profil, ob ein Deposit erforderlich ist und in welcher Form.

---

### 10.2 Neuer localStorage-Key: `app_escrow`

**Typ:** Array
**Zugriff ausschliesslich ueber:** `adapter-localstorage.js`

```
app_escrow: [
  {
    escrowId,            // string  — 'esc_' + Date.now().toString(36)
    slotId,              // string  — Referenz auf app_slots[].slotId
    studentId,           // string  — UID
    teacherId,           // string  — UID

    depositAmount,       // number  — berechneter Deposit-Betrag in $
    depositType,         // string  — 'fixed' | 'percent'
    depositPercent,      // number|null — z.B. 20, nur wenn depositType='percent'
    fullAmount,          // number  — Gesamtpreis (aus profile.pricePerHalfHour)
    negotiatedAmount,    // number|null — abweichender Preis nach Verhandlung

    paymentMode,         // string  — 'instant' | 'cash_on_site'  (aus Teacher-Profil)
    requiresDeposit,     // bool    — aus Teacher-Profil zum Zeitpunkt der Buchung

    depositStatus,       // string  — siehe Status-Flow unten
    fullPaymentStatus,   // string  — 'unpaid' | 'paid' | 'verified'

    depositPaidAt,       // string|null  — ISO
    fullPaidAt,          // string|null  — ISO
    studentConfirmedAt,  // string|null  — ISO — Schüler bestätigt nach Stunde
    releasedAt,          // string|null  — ISO — Teacher gibt frei / System verrechnet
    createdAt            // string  — ISO
  }
]
```

**Firestore-Migration:** Collection `escrow/{escrowId}` — 1:1 abbildbar, kein Refactoring nötig.

---

### 10.3 depositStatus — Status-Flow

```
unpaid
  └─► held              Student zahlt Deposit → landet im Escrow
        ├─► released    Schüler bestätigt Stunde → Deposit mit Vollzahlung verrechnet
        └─► refund_requested   Schüler storniert → Teacher entscheidet
              ├─► refunded     Teacher gibt Deposit zurück → Student-Wallet +
              └─► forfeited    Teacher behält Deposit → Trollschutz greift
```

**fullPaymentStatus-Flow:**
```
unpaid
  └─► paid      instant: beim Buchen / cash_on_site: manuell durch Student
        └─► verified   nach studentConfirmedAt
```

---

### 10.4 Profil-Erweiterung (profile.js — getDefault)

Neue Felder im Profile-Schema — werden in `getDefault()` ergänzt:

```
requiresDeposit:  bool     — Standard: true
depositMode:      string   — 'fixed' | 'percent'   — Standard: 'fixed'
depositFixed:     number   — Standard: 50  (in $)
depositPercent:   number   — Standard: 20  (%)
paymentMode:      string   — 'instant' | 'cash_on_site'   — Standard: 'instant'
```

**Bestehende Felder bleiben unverändert.** Keine Migration nötig — `getOrDefault()` liefert
für alte Profile automatisch die Standardwerte.

---

### 10.5 AppService-Methoden (Escrow)

Alle Methoden folgen der Node.js-Callback-Konvention: `function(err, result)`.

#### Lesen

| Methode | Parameter | Result |
|---|---|---|
| `getEscrowBySlot(slotId, cb)` | slotId | escrow\|null |
| `getEscrowsByStudent(studentId, cb)` | studentId | escrow[] |
| `getEscrowsByTeacher(teacherId, cb)` | teacherId | escrow[] |
| `getEscrow(escrowId, cb)` | escrowId | escrow\|null |

#### Erstellen

| Methode | Parameter | Result |
|---|---|---|
| `createEscrow(slotId, studentId, teacherId, cb)` | — | escrow |

Berechnet `depositAmount` automatisch aus Teacher-Profil (`depositMode`, `depositFixed`, `depositPercent`, `pricePerHalfHour`).

#### Aktionen — Student

| Methode | Transition | Result |
|---|---|---|
| `payDeposit(escrowId, cb)` | `unpaid → held` | escrow |
| `requestDepositRefund(escrowId, cb)` | `held → refund_requested` | escrow |
| `confirmLesson(escrowId, cb)` | setzt `studentConfirmedAt`, löst Release aus | escrow |

#### Aktionen — Teacher

| Methode | Transition | Result |
|---|---|---|
| `releaseDeposit(escrowId, cb)` | `refund_requested → refunded` | escrow |
| `forfeitDeposit(escrowId, cb)` | `refund_requested → forfeited` | escrow |
| `updateNegotiatedAmount(escrowId, amount, cb)` | setzt `negotiatedAmount` | escrow |

---

### 10.6 Badge-Status-Mapping (UI)

| depositStatus | Label (DE) | Farbe | Sichtbar für |
|---|---|---|---|
| `unpaid` | Deposit ausstehend | grau (`--neutral-300`) | Student |
| `held` | Deposit hinterlegt | blau (`--color-400`) | beide |
| `refund_requested` | Rückerstattung beantragt | amber (`#f5a623`) | beide |
| `refunded` | Erstattet | grün (`#065f46`) | beide |
| `forfeited` | Deposit einbehalten | rot (`#991b1b`) | beide |
| `released` | Abgeschlossen | grün (`#065f46`) | beide |

Sonderfall `paymentMode = 'cash_on_site'` + kein Deposit:
Label „Barzahlung vor Ort", Farbe neutral, nur für Student sichtbar.

Badges erscheinen:
- **Kalender-Grid:** kompakt (Icon + Status-Farbe, kein Text)
- **Day-Panel / Slot-Detail:** Label + Betrag + Aktions-Button je nach Rolle und Status

---

### 10.7 Datei-Zugriffs-Matrix (Erweiterung)

Ergänzung zu Abschnitt 4:

| Datei | EscrowStore |
|-------|:-----------:|
| adapter-localstorage.js | CRUD (DEF) |
| app-service.js | API |
| teacher.js | R + Aktionen |
| student.js | R + Aktionen |
| profile.js | R (depositMode, depositFixed, etc.) |

---

### 10.8 Implementierungsreihenfolge

| Schritt | Datei | Status |
|---|---|---|
| 1 | `CRUD_SERVICE_REFERENCE_v2.md` | ✅ Erledigt |
| 2 | `adapter-localstorage.js` — Escrow-Methoden | ⬜ Offen |
| 3 | `app-service.js` — Methoden exportieren | ⬜ Offen |
| 4 | `locales/teacher.json` + `locales/student.json` | ⬜ Offen |
| 5 | Badge-CSS in `teacher.css` / `student.css` | ⬜ Offen |
| 6 | `teacher.js` — Badge-Rendering + Aktionen | ⬜ Offen |
| 7 | `student.js` — Badge-Rendering + Aktionen | ⬜ Offen |
| 8 | `profile-edit` — Zahlungseinstellungen | ⬜ Offen |

