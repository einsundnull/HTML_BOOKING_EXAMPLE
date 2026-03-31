# E-Mail Notification System — Dokumentation

## Übersicht

Jede relevante Aktion im Buchungssystem löst **zwei Benachrichtigungen** aus — gleichzeitig:

1. **Chat Service-Nachricht** — erscheint im Chat-Panel des Empfängers
2. **E-Mail** — Fallback für den Fall dass der Empfänger gerade nicht online ist

---

## Architektur

```
Browser (email.js)
    │
    │  POST /api/send-email
    ▼
Eigener Server (Node.js)        ← API-Key ist hier gespeichert, NICHT im Browser
    │
    │  POST api.mailgun.net/v3/{domain}/messages
    ▼
Mailgun API
    │
    ▼
Empfänger-Postfach
```

### Warum über einen Server?

Der Mailgun API-Key darf **niemals im Browser-Code** stehen — er wäre für jeden Nutzer sichtbar. Der Browser schickt nur die Nutzdaten (Empfänger, Betreff, Text) an einen eigenen Endpunkt. Der Server hält den Key in einer Umgebungsvariable.

---

## Aktueller Status: Mockup

`EmailService._MOCK_MODE = true`

Im Mockup-Modus:
- Kein echter HTTP-Call
- E-Mail wird in `console.log` ausgegeben
- E-Mail wird in `localStorage` (`app_email_log`) gespeichert
- Das Log kann mit `EmailService.getLog()` ausgelesen werden

---

## Integration aktivieren (Mailgun)

### Schritt 1 — Mailgun einrichten
1. Account auf [mailgun.com](https://mailgun.com) erstellen
2. Domain verifizieren (oder Sandbox-Domain für Tests verwenden)
3. API-Key notieren

### Schritt 2 — Server-Endpunkt erstellen

```javascript
// server.js (Node.js / Express Beispiel)
const express = require('express');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
app.use(express.json());

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

app.post('/api/send-email', async (req, res) => {
  const { to, toName, subject, text } = req.body;
  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: 'Buchungssystem <noreply@' + process.env.MAILGUN_DOMAIN + '>',
      to:   [toName + ' <' + to + '>'],
      subject,
      text
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mailgun error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);
```

### Schritt 3 — email.js konfigurieren

In `email.js` zwei Werte ändern:

```javascript
var _MOCK_MODE    = false;                              // war: true
var _API_ENDPOINT = 'https://yourserver.com/api/send-email'; // war: '/api/send-email'
```

### Schritt 4 — E-Mail-Adressen der User

Jeder User braucht ein `email`-Feld im Store. Aktuell beim Erstellen:

```javascript
Store.Users.create({
  uid:   'teacher_01',
  name:  'Erika Muster',
  role:  'teacher',
  email: 'erika@example.com'   // ← NEU
});
```

Bestehende User ohne E-Mail: `EmailService.send()` loggt einen Hinweis und sendet nicht.

---

## Events & Trigger-Stellen

| Event | Ausgelöst von | Empfänger | Datei / Funktion |
|---|---|---|---|
| `new_message` | Neue Chat-Nachricht senden | Gesprächspartner | `chat.js` → `_handleSend()` |
| `booking_created` | Student bucht Slot | Teacher | `student.js` → `commitDayChanges()` |
| `booking_created` | Teacher bucht Slot für Student | Student | `teacher.js` → `saveBookingChanges()` |
| `booking_cancelled` | Student storniert Slot | Teacher | `student.js` → `commitDayChanges()` |
| `booking_cancelled` | Teacher storniert Buchung | Student | `teacher.js` → `saveBookingChanges()` |
| `booking_moved` | Block verschieben | Gegenpart | `ui.js` → `openMoveBlockDialogShared()` *(TODO)* |
| `request_received` | Student wählt Teacher | Teacher | `student.js` → `selectTeacher()` |
| `request_accepted` | Teacher nimmt Student an | Student | `chat.js` → `_respondServiceRequest()` |
| `request_declined` | Teacher lehnt Student ab | Student | `chat.js` → `_respondServiceRequest()` |
| `disconnected` | Student entfernt Teacher | Teacher | `student.js` → `_executeRemoveTeacher()` |

### Noch ausstehend (TODO)

- `booking_moved` in `ui.js → openMoveBlockDialogShared()` — der `onConfirm`-Callback muss nach der Verschiebung `EmailService.onBookingMoved()` aufrufen. Wird separat implementiert sobald der Move-Flow finalisiert ist.

---

## EmailService API

```javascript
// Generischer Send
EmailService.send({
  toUid: 'teacher_01',        // UID des Empfängers
  event: EmailService.EVENTS.BOOKING_CREATED,
  data:  { actorName, date, time, endTime, teacherName, studentName }
});

// Convenience-Methoden
EmailService.onNewMessage(toUid, senderName, previewText);
EmailService.onBookingCreated(toUid, { actorName, date, time, endTime, teacherName, studentName });
EmailService.onBookingCancelled(toUid, { actorName, date, time, endTime, teacherName, studentName });
EmailService.onBookingMoved(toUid, { actorName, oldDate, oldTime, oldEndTime, newDate, newTime, newEndTime, teacherName, studentName });
EmailService.onRequestReceived(teacherUid, studentName);
EmailService.onRequestAccepted(studentUid, teacherName);
EmailService.onRequestDeclined(studentUid, teacherName);
EmailService.onDisconnected(teacherUid, studentName, cancelledSlots);

// Log (nur Mockup)
EmailService.getLog();    // Array der simulierten E-Mails
EmailService.clearLog();  // Log leeren
```

---

## User-Datenstruktur

```javascript
// app_users (localStorage)
{
  uid:   string,   // eindeutige ID
  name:  string,   // Anzeigename
  role:  string,   // 'teacher' | 'student' | 'admin'
  email: string    // E-Mail-Adresse für Benachrichtigungen
}
```

---

## E-Mail-Format

Alle E-Mails sind **Plain-Text** — kein HTML. Das ist bewusst:
- Zuverlässig zustellbar (kein Spam-Filter-Risiko durch HTML)
- In jedem E-Mail-Client lesbar
- Einfach zu erweitern

Beispiel — Buchungsbenachrichtigung:

```
Max Mustermann hat eine Buchung vorgenommen.

Datum:     Mo., 16. Mär. 2026
Uhrzeit:   10:00 – 10:30
Lehrer/in: Erika Muster
Schüler/in: Max Mustermann

──────────────────────────
Diese E-Mail wurde automatisch vom Buchungssystem gesendet.
```

---

## Dateien

| Datei | Beschreibung |
|---|---|
| `js/email.js` | EmailService — zentrales E-Mail-Objekt, Mockup + Mailgun-ready |
| `EMAIL_SYSTEM.md` | Diese Dokumentation |

### Einbindung in HTML

`email.js` muss **nach `store.js`** und **vor** `student.js`, `teacher.js`, `chat.js` geladen werden:

```html
<script src="./js/store.js"></script>
<script src="./js/email.js"></script>   <!-- ← hier -->
<script src="./js/chat.js"></script>
<script src="./js/student.js"></script>
```
