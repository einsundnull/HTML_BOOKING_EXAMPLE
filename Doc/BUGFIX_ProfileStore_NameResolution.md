# BUGFIX DOCUMENTATION — ProfileStore Name Resolution & Script Load Order

**Datum:** 2026-03-11  
**Betrifft:** `profile.js`, `teacher.js`, `student.js`, `chat.js`, `navbar.js`, alle `.html` Dateien  
**Status:** Gepatcht — Residual-Redundanz möglich (siehe Abschnitt 4)

---

## 1. Problem-Beschreibung

### 1.1 Root Cause A — Falscher Name-Zugriff überall

Das Projekt hat zwei parallele Datenquellen für Benutzernamen:

| Store | localStorage Key | Enthält |
|---|---|---|
| `Store.Users` | `app_users` | `uid`, `name` (Mock-Name wie `t1`, `s1`), `role`, `email` |
| `ProfileStore` | `app_profiles` | Alle Profilfelder inkl. `name` (echter Name vom User eingegeben) |

**Die Regel:** Immer `ProfileStore.getDisplayName(uid)` verwenden. Diese Funktion gibt den Profil-Namen zurück wenn vorhanden, sonst den Store-Namen als Fallback.

**Der Bug:** In `teacher.js`, `student.js`, `chat.js` und `navbar.js` wurde direkt auf `user.name`, `student.name`, `partner.name` etc. zugegriffen — also immer der Mock-Name (`t1`, `s1`) statt dem echten Profil-Namen.

### 1.2 Root Cause B — Falsche Script-Ladereihenfolge

`profile.js` wurde in mehreren HTML-Dateien **vor** `store.js` geladen. `ProfileStore` ruft intern `Store.Users.byUid()` auf — was `store.js` voraussetzt. Wurde `profile.js` zuerst geladen, war `Store` beim Aufruf `undefined` → stille Fehler beim Speichern/Laden.

**Korrekte Reihenfolge (PFLICHT):**
```
store.js → profile.js → auth.js → ui.js → navbar.js → [page].js → chat.js
```

### 1.3 Root Cause C — ProfileView mit `get()` statt `getOrDefault()`

`ProfileView.init()` nutzte `ProfileStore.get(uid)` — gibt `null` zurück wenn noch kein Profil gespeichert. Für neue Teacher ohne ausgefülltes Profil → „Kein Profil gefunden". Fix: `getOrDefault(uid)` + vorher prüfen ob `Store.Users.byUid(uid)` existiert.

### 1.4 Root Cause D — Foto überschreitet localStorage-Limit

Profilbilder wurden als raw base64 gespeichert (bis 2 MB → ~2.7 MB base64). Bei mehreren Profilen überschritt das die 5–10 MB localStorage-Grenze → `QuotaExceededError` → Profil nicht gespeichert, kein sichtbarer Fehler.

---

## 2. Durchgeführte Fixes

### Fix 1 — `student.js`: 10 Stellen

| Zeile (ca.) | Alt | Neu |
|---|---|---|
| Block-Header teacher | `teacher ? teacher.name : opts.teacherId` | `ProfileStore.getDisplayName(opts.teacherId)` |
| Slot-Zeilen teacher | `tObj ? tObj.name : opts.teacherId` | `ProfileStore.getDisplayName(opts.teacherId)` |
| Teacher-Dropdown | `myTeachers[i].name` | `ProfileStore.getDisplayName(myTeachers[i].uid)` |
| selectTeacher Toast | `teacher.name` | `ProfileStore.getDisplayName(teacherId)` |
| confirmRemoveTeacher | `teacher ? teacher.name : teacherId` | `ProfileStore.getDisplayName(teacherId)` |
| executeRemoveTeacher | `teacher ? teacher.name : teacherId` | `ProfileStore.getDisplayName(teacherId)` |
| myBookings tName | `teacher ? teacher.name : s.teacherId` | `ProfileStore.getDisplayName(s.teacherId)` |
| Grid-Overlay Header | `teacher ? teacher.name : ''` | `ProfileStore.getDisplayName(activeTeacherId)` |

### Fix 2 — `teacher.js`: 14 Stellen

Alle `student.name`, `stu.name`, `currentUser.name` Referenzen in sichtbaren UI-Elementen ersetzt durch `ProfileStore.getDisplayName(uid)`.

Betroffene Stellen: Studenten-Liste (`name.textContent`), Buchungsblöcke, Slot-Zeilen, Dropdown-Optionen, Toast-Nachrichten, Move-Dialog, Email-Service Aufrufe.

### Fix 3 — `chat.js`: 5 Stellen

| Kontext | Alt | Neu |
|---|---|---|
| Chat-Liste Name | `partner.name` | `ProfileStore.getDisplayName(partner.uid)` |
| Chat-Header Name | `partner.name` | `ProfileStore.getDisplayName(partner.uid)` |
| Service-Message Text | `su.name` / `tu.name` | `ProfileStore.getDisplayName(msg.studentId/teacherId)` |
| Accept/Decline Toast | `su.name` / `tName = currentUser.name` | `ProfileStore.getDisplayName(uid)` |
| Bubble-Avatar Initialen | `_initials(_activePartner.name)` | `_initials(ProfileStore.getDisplayName(uid))` |
| onNewMessage Sender | `_currentUser.name \|\| _currentUser.uid` | `ProfileStore.getDisplayName(_currentUser.uid)` |

### Fix 4 — `navbar.js`: 2 Stellen

| Kontext | Alt | Neu |
|---|---|---|
| Dropdown Username | `user.name` | `ProfileStore.getDisplayName(user.uid)` |
| Dropdown beim Öffnen | einmalig beim Init | `_openDropdown()` liest Namen neu bei jedem Öffnen |

Der Username-Span hat jetzt eine `id="navbar-dropdown-username"` und wird bei jedem `_openDropdown()` Aufruf per `ProfileStore.getDisplayName()` aktualisiert — damit Namensänderungen ohne Seitenreload sichtbar sind.

### Fix 5 — `profile.js` (ProfileView)

```js
// ALT — schlägt fehl für User ohne gespeichertes Profil
_profile = ProfileStore.get(_uid);
if (!_profile) { _renderError(...); return; }

// NEU — funktioniert immer wenn User existiert
var user = Store.Users.byUid(_uid);
if (!user) { _renderError(...); return; }
_profile = ProfileStore.getOrDefault(_uid);
```

### Fix 6 — `profile.js` (Foto-Komprimierung)

Fotos werden beim Upload via Canvas auf max. 400×400px / JPEG 80% komprimiert → ca. 20–60 KB statt 2+ MB. `localStorage` limit wird nicht mehr überschritten.

### Fix 7 — Script-Ladereihenfolge in allen HTML-Dateien

**Korrekte Reihenfolge (gilt für alle Seiten):**
```html
<script src="./js/store.js?v=..."></script>
<script src="./js/profile.js?v=..."></script>
<script src="./js/email.js?v=..."></script>
<script src="./js/auth.js?v=..."></script>
<script src="./js/ui.js?v=..."></script>
<script src="./js/navbar.js?v=..."></script>
<script src="./js/[page].js?v=..."></script>
<script src="./js/chat.js?v=..."></script>
```

---

## 3. Aktuelle Versionen nach Patch

| Datei | Version |
|---|---|
| `store.js` | v=8 |
| `profile.js` | v=8 |
| `auth.js` | v=8 |
| `ui.js` | v=8 |
| `navbar.js` | v=11 |
| `teacher.js` | v=9 |
| `student.js` | v=12 |
| `chat.js` | v=4 |
| `admin.js` | v=9 |
| `email.js` | v=1 |

---

## 4. Aufgaben für das nächste LLM — Residual-Redundanz prüfen

### 4.1 Vollständige Suche nach verbleibenden `.name` Zugriffen

Folgende Patterns in **allen** `.js` Dateien suchen und prüfen ob sie `ProfileStore.getDisplayName()` verwenden sollten:

```
grep -rn "\.name\b" ./js/ | grep -v "//\|className\|displayName\|getDisplay\|userName\|file_name\|last_name\|first_name\|domain\|function\|tagName\|nodeName\|innerHTML"
```

**Jeder Treffer muss bewertet werden:**
- Ist es ein User/Student/Teacher Name der im UI angezeigt wird? → `ProfileStore.getDisplayName(uid)`
- Ist es ein internes Feld (z.B. `user.email`, `user.role`)? → OK, kein Fix nötig
- Ist es ein DOM-Eigenschaft (`.className`, `.nodeName`)? → OK

### 4.2 Email-Service prüfen (`email.js`)

`EmailService` empfängt Namens-Parameter von anderen Stellen. Prüfen ob intern noch `.name` Felder direkt aus `Store.Users` gelesen werden:

```
grep -n "\.name\b\|user\.name\|student\.name\|teacher\.name" ./js/email.js
```

### 4.3 `admin.js` prüfen

Admin-Panel zeigt User-Tabelle. Prüfen ob `Store.Users.all()` Einträge mit `.name` direkt gerendert werden statt `ProfileStore.getDisplayName()`:

```
grep -n "\.name\b\|\.textContent\|innerHTML" ./js/admin.js | grep -v "//"
```

### 4.4 `ui.js` prüfen (Move-Dialog, Shared Dialogs)

`openMoveBlockDialogShared()` und ähnliche Shared-UI-Funktionen empfangen `student`/`teacher` Objekte. Prüfen ob `.name` direkt verwendet wird:

```
grep -n "\.name\b" ./js/ui.js | grep -v "//\|className"
```

### 4.5 Service-Messages in `chat.js` — gespeicherte Nachrichten

Service-Messages werden mit dem Namen zum Zeitpunkt des Sendens in `localStorage` gespeichert (z.B. `"t1 hat deine Anfrage angenommen"`). Diese historischen Nachrichten enthalten noch den alten Mock-Namen. 

**Entscheidung nötig:** Sollen historische Service-Messages beim Rendern den gespeicherten Namen überschreiben mit `ProfileStore.getDisplayName()`, oder ist der historische Name akzeptabel?

Aktueller Stand: Service-Messages werden beim **Rendern** neu gebaut — der Name wird aus `msg.studentId`/`msg.teacherId` via `ProfileStore.getDisplayName()` gelesen, nicht aus dem gespeicherten Text. ✅ Kein Handlungsbedarf.

### 4.6 Verwaiste `Store.Users.byUid()` Aufrufe die nur den Namen wollen

Pattern: `var x = Store.Users.byUid(uid); ... x.name` — wenn nur der Name gebraucht wird, direkt durch `ProfileStore.getDisplayName(uid)` ersetzen:

```
grep -n "Store\.Users\.byUid" ./js/*.js
```

Für jeden Treffer prüfen: Wird nur `.name` verwendet → ersetzen. Wird `.role`, `.email` o.ä. verwendet → `Store.Users.byUid()` behalten, aber `.name` durch `ProfileStore.getDisplayName()` ersetzen.

---

## 5. Invarianten — Diese Regeln NIEMALS brechen

```
1. IMMER  ProfileStore.getDisplayName(uid)  für sichtbare Namen im UI
2. NIEMALS user.name / student.name / partner.name direkt im UI
3. store.js MUSS vor profile.js geladen werden
4. ProfileStore.get(uid) gibt null zurück wenn kein Profil → getOrDefault(uid) verwenden
5. Fotos nur komprimiert speichern (max 400px, JPEG 80%)
```

---

## 6. ProfileStore API — Referenz

```js
ProfileStore.get(uid)              // Gespeichertes Profil oder null
ProfileStore.getOrDefault(uid)     // Gespeichertes Profil oder leeres Default-Objekt
ProfileStore.save(uid, profileData) // Speichert Profil in localStorage
ProfileStore.getDisplayName(uid)   // Profil-Name > Store-Name > uid (Fallback-Kette)
ProfileStore.getPhoto(uid)         // base64 Foto oder null
ProfileStore.getPrice(uid)         // Preis oder null
ProfileStore.getSpecializations(uid) // Array oder []
```

**Fallback-Kette `getDisplayName()`:**
```
ProfileStore.get(uid).name (wenn nicht leer)
  → Store.Users.byUid(uid).name (wenn User existiert)
    → uid (letzter Fallback)
```
