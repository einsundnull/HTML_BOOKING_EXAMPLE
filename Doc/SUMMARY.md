# BookingSystem — Projekt-Zusammenfassung
> Für den nächsten Chat: alles was nötig ist, um den Code direkt weiterzuschreiben.

---

## Ziel
Lokale Multi-Rollen-Buchungsapp (file:// Browser), kein Server, kein Framework.

---

## Ordnerstruktur
```
/HTML/
├── index.html          Login
├── admin.html          Admin-Dashboard
├── teacher.html        Teacher-Kalender
├── student.html        Student-Katalog + Buchung
├── navbar.html         (Fragment, nicht direkt öffnen)
├── css/
│   ├── tokens.css      Design Tokens
│   ├── base.css        Reset, Layout, Topbar
│   ├── components.css  Buttons, Cards, Forms, Tables, Modals
│   └── navbar.css      Universelle Navbar (NEU)
└── js/
    ├── store.js        localStorage Service
    ├── auth.js         URL-Parameter Session
    ├── ui.js           Toast, Modal
    ├── navbar.js       Navbar Injection (NEU)
    ├── admin.js        Admin-Logik
    ├── teacher.js      Teacher-Logik
    └── student.js      Student-Logik
```

---

## Design System
- **Font:** Figtree 400/600 (Google Fonts)
- **Basis:** Navy `#060f1c` (`--color-900`)
- **Accent:** `--color-400` = `#4d7aa0`
- **Spacing:** 8-pt Grid (`--sp-1`=4px bis `--sp-9`=128px)
- **Radius:** `--radius-sm`=4px, `--radius-md`=8px
- **Transitions:** `--transition: 150ms ease`
- Kein Gradient, keine Schatten außer `--shadow`, 1px Borders

---

## Session-System (WICHTIG)
**URL-Parameter:** Session = `?uid=xxx` in der URL.
- Kein localStorage/sessionStorage für Auth (file:// inkompatibel)
- `Auth.current()` liest `?uid=` → `Store.Users.byUid(uid)`
- `Auth.login(uid)` → redirect zu `role.html?uid=uid`
- `Auth.logout()` → redirect zu `index.html` (kein Parameter)
- `Auth.require('role')` → guard, gibt User zurück oder redirected

---

## Data Model (localStorage)
```
app_users:      [{ uid, name, role }]
app_bookings:   [{ bookingId, teacherId, studentId, date, start, end, status }]
app_selections: [{ studentId, teacherId }]
```
- `status` Werte: `'available'` | `'blocked'` | `'timeout'` | `'booked'`
- Admin-Account wird beim ersten Load auto-geseedet: `{ uid:'admin', name:'Administrator', role:'admin' }`
- Cascade Delete: User löschen → Bookings + Selections werden mitgelöscht

---

## Store API
```js
Store.Users.all()              // alle User
Store.Users.byUid(uid)         // einzelner User oder null
Store.Users.byRole(role)       // Array nach Rolle
Store.Users.create({uid,name,role})  // wirft Error wenn UID existiert
Store.Users.delete(uid)        // cascade

Store.Bookings.all()
Store.Bookings.byTeacher(uid)
Store.Bookings.byStudent(uid)
Store.Bookings.create({teacherId,studentId,date,start,end,status})
Store.Bookings.update(bookingId, patch)
Store.Bookings.delete(bookingId)

Store.Selections.byStudent(uid)
Store.Selections.byTeacher(uid)
Store.Selections.exists(studentId, teacherId)
Store.Selections.create(studentId, teacherId)
Store.Selections.delete(studentId, teacherId)
```

---

## Auth API
```js
Auth.current()           // User aus URL oder null
Auth.login(uid)          // redirect zu passendem HTML + ?uid=
Auth.logout()            // redirect zu index.html
Auth.require('role')     // guard → User oder null (+ redirect)
```

---

## UI Utilities
```js
Toast.success('Nachricht')
Toast.error('Nachricht')

Modal.show({ title, bodyHTML, footerHTML })
// → gibt { close } zurück
// Buttons im footerHTML mit onclick oder addEventListener nach Modal.show()
```

---

## Navbar (NEU — noch nicht in HTML-Files integriert)
**Standalone Files:** `css/navbar.css` + `js/navbar.js`

**Integration in jede Seite:**
1. `<link rel="stylesheet" href="./css/navbar.css" />` im `<head>`
2. Scripts laden: `store.js` → `auth.js` → `ui.js` → `navbar.js` → page.js
3. In page.js als erstes in `DOMContentLoaded`:
```js
Navbar.init('activePage');
// activePage: 'admin' | 'teacher' | 'catalog' | 'book'
```
4. Den bestehenden `<header class="topbar">` aus den HTML-Files entfernen
   (Navbar ersetzt ihn vollständig)

**Was Navbar.init() macht:**
- Injiziert `<nav class="navbar">` als erstes `body`-Child
- Liest User aus URL (`Auth.current()`)
- Zeigt role-abhängige Links (Admin: Users / Teacher: Calendar / Student: Catalog + Book)
- Hebt aktive Seite hervor
- Logout-Button ruft `Auth.logout()` auf
- `navbar.css` wird automatisch per JS ins `<head>` eingefügt (kein manueller Link nötig)

---

## Script-Ladereihenfolge (jede Seite)
```html
<script src="./js/store.js"></script>
<script src="./js/auth.js"></script>
<script src="./js/ui.js"></script>
<script src="./js/navbar.js"></script>   ← NEU
<script src="./js/admin.js"></script>    ← je nach Seite
```

---

## Was noch fehlt / nächste Schritte
1. **Navbar in HTML-Files integrieren:** `<header class="topbar">` entfernen, `navbar.js` laden, `Navbar.init()` aufrufen
2. **Student "Book"-Tab:** `Navbar.init('book')` wenn Book-View aktiv ist (via switchView)
3. **Evtl. Buchungsübersicht** für Teacher (alle Buchungen eines Tages als Liste)
4. **Evtl. Admin-Statistiken** (Buchungsrate pro Teacher)

---

## Bekannte Bugs (behoben)
- sessionStorage bei file:// → gelöst mit URL-Parametern
- Auto-Redirect Loop auf index.html → entfernt (kein Auto-Redirect mehr)
- Inline JS in HTML-Files → alle JS-Files sind jetzt extern
- Arrow Functions / `??` Operator → vollständig entfernt für Kompatibilität

---

## JS-Stil (WICHTIG für Konsistenz)
**Kein modernes JS** — alles in kompatiblem ES5-nahem Stil:
- `var` statt `const`/`let`
- Keine Arrow Functions `=>`
- Kein `??` Nullish Coalescing
- Kein Optional Chaining `?.`
- Keine Template Literals `` ` ``
- String-Konkatenation mit `+`
- `function() {}` statt `() => {}`
