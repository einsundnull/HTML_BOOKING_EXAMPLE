# GUIDELINES_JS — JavaScript & Architektur-Richtlinien
*Verbindlich für alle neuen Features und jeden neuen Code in diesem Projekt.*
*Lies diese Datei vor jeder Implementierung.*

---

## 1. Zweck

Diese Richtlinien stellen sicher, dass der Code:

1. **Heute** funktioniert — vollständig im Mockup via localStorage.
2. **Morgen** migrierbar ist — ein einziger Code-Swap reicht, um auf Firestore zu wechseln.
3. **Konsistent** bleibt — jeder Entwickler schreibt Datenzugriffe auf dieselbe Art.

---

## 2. JavaScript-Stil (unveränderlich)

Diese Regeln gelten für **jede** `.js`-Datei im Projekt, ohne Ausnahmen.

| Regel | Richtig | Falsch |
|---|---|---|
| Variablen | `var x = 1;` | `let x`, `const x` |
| Funktionen | `function foo() {}` | `() => {}` |
| String-Verkettung | `'Hallo ' + name` | `` `Hallo ${name}` `` |
| Nullprüfung | `if (x == null)` | `x?.y`, `x ?? y` |
| Methodenreferenzen | `function(x) { return fn(x); }` | `fn` als Callback direkt |
| Kommentare | Deutsch oder Englisch, konsistent pro Datei | Gemischt |

**Begründung:** Die Codebasis ist auf maximale Browser-Kompatibilität ausgelegt und soll ohne Transpiler funktionieren. Diese Regeln sind nicht verhandelbar.

---

## 3. Datenzugriff — Die wichtigste Regel

> **Kein Consumer-Code darf jemals direkt auf `Store`, `localStorage`, `ProfileStore` oder später das Firestore-SDK zugreifen.**

Consumer-Code ist alles außerhalb des Service-Layers:
`skiing-catalog.js`, `teacher.js`, `student.js`, `admin.js`, `navbar.js`, `chat.js` und alle zukünftigen Feature-Dateien.

**Richtig:**
```js
AppService.getTeachersWithProfiles(function(err, teachers) {
  if (err) { /* Fehler behandeln */ return; }
  /* teachers verwenden */
});
```

**Falsch:**
```js
/* NIEMALS so — direkt in Consumer-Code */
var teachers = Store.Users.byRole('teacher');
var profile  = ProfileStore.getOrDefault(uid);
```

Der einzige Ort, an dem `Store` und `ProfileStore` aufgerufen werden dürfen, ist **`adapter-localstorage.js`**.
Der einzige Ort, an dem das Firestore SDK aufgerufen wird, ist **`adapter-firestore.js`**.

---

## 4. Alles ist asynchron

Jede Datenzugriffs-Methode im Service-Layer ist asynchron — auch wenn die Implementierung intern synchron ist.

**Signatur-Schema:**
```js
AppService.methodName(params, function(err, result) {
  if (err) { /* immer zuerst prüfen */ return; }
  /* result verwenden */
});
```

**Warum, obwohl localStorage synchron ist?**

Der LocalStorage-Adapter ruft den Callback synchron auf — das ist gültig. Der Firestore-Adapter ruft ihn asynchron auf — das ist ebenfalls gültig. Der Consumer-Code unterscheidet das nicht. Er schreibt denselben Code für beide Fälle.

Wenn die Datenzugriffe heute synchron geschrieben werden und wir später auf Firestore migrieren, müsste **jede einzelne Aufrufstelle** im Consumer-Code umgeschrieben werden. Das ist der Fehler, den wir vermeiden.

---

## 5. Layer-Architektur

```
┌─────────────────────────────────────────────────────┐
│  Consumer Code                                       │
│  skiing-catalog.js, teacher.js, student.js, ...      │
│  Ruft nur AppService.* auf. Kennt keine DB-Details.  │
└──────────────────────┬──────────────────────────────┘
                       │  AppService.methodName(params, callback)
┌──────────────────────▼──────────────────────────────┐
│  AppService  (app-service.js)                        │
│  Definiert die API. Delegiert an den aktiven Adapter.│
│  Enthält keine Implementierungslogik.                │
└──────────────────────┬──────────────────────────────┘
                       │  delegates to active adapter
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────────┐   ┌─────────▼──────────────┐
│  LocalStorageAdapter│   │  FirestoreAdapter       │
│  Wraps Store +      │   │  Wraps Firestore SDK    │
│  ProfileStore       │   │  Identische Signaturen  │
│  (Mockup)           │   │  (Produktion)           │
└────────────────────┘   └────────────────────────┘
```

---

## 6. Der Adapter-Swap

Es gibt **eine einzige Datei**, die bestimmt, welcher Adapter aktiv ist:

```js
/* app-config.js */
var AppAdapter = LocalStorageAdapter;
/* var AppAdapter = FirestoreAdapter; */  /* ← diese eine Zeile für Produktion */
```

Das ist der vollständige Migrations-Aufwand auf der Code-Ebene.
Kein Suchen und Ersetzen. Kein Refactoring von Consumer-Dateien. Eine Zeile.

---

## 7. Datenschema — Firestore-kompatible Strukturen

Alle Daten müssen so modelliert werden, dass sie direkt als Firestore-Collections abbildbar sind.

### 7.1 Grundregeln

| Regel | Richtig | Falsch |
|---|---|---|
| Collections sind flache Arrays | `[{uid, name, role}, ...]` | `{uid: {name, role}, ...}` |
| Dokument-ID = logische ID | `uid` als Dokument-ID | Auto-generierte IDs für User-Entitäten |
| Arrays für Mehrfachwerte | `levels: ['beginner', 'advanced']` | `level_beginner: true, level_advanced: true` |
| Codes statt Klartext | `languages: ['de', 'en']` | `languages: ['Deutsch', 'Englisch']` |
| Zahlen als Strings (Formular-Output) | `pricePerHalfHour: '60'` | OK — wird in Adapter bei Bedarf konvertiert |
| Keine tief verschachtelten Objekte | Max. 1 Ebene Verschachtelung | `profile.teaching.levels.beginner.active` |

### 7.2 Bestehende Entitäten (unveränderlich)

Diese Schemas sind festgelegt und dürfen nicht geändert werden:

```
User:     { uid, name, role, email }
Slot:     { slotId, teacherId, studentId|null, date, time, status, baseStatus }
Recurring:{ recurringId, teacherId, dayOfWeek, time }
Selection:{ studentId, teacherId }
Profile:  { uid, name, age, gender, location, bio, photo,
            pricePerHalfHour, experienceYears, languages[],
            lessonTypes[], audience[], ageFrom, ageTo, levels[],
            maxGroupSize, terrain[], certifications[],
            specializations[], email, emailVisible, phone,
            phoneVisible, instagram, website, updatedAt }
```

### 7.3 Neue Entitäten

Neue Entitäten müssen vor der Implementierung dokumentiert werden — in `CRUD_SERVICE_REFERENCE_v2.md` und als Kommentar-Block am Anfang der zugehörigen Adapter-Methode.

---

## 8. AppService — Methoden-Konventionen

### 8.1 Namensschema

| Operation | Schema | Beispiel |
|---|---|---|
| Einzelnes Objekt lesen | `get[Entity](id, cb)` | `getUser(uid, cb)` |
| Liste lesen | `get[Entities](cb)` | `getTeachers(cb)` |
| Gefilterte Liste | `get[Entities]Where(params, cb)` | `getTeachersWhere({role:'teacher'}, cb)` |
| Kombinierte Abfrage | `get[A]With[B](params, cb)` | `getTeachersWithProfiles(cb)` |
| Erstellen | `create[Entity](data, cb)` | `createUser(data, cb)` |
| Aktualisieren | `update[Entity](id, patch, cb)` | `updateProfile(uid, patch, cb)` |
| Löschen | `delete[Entity](id, cb)` | `deleteUser(uid, cb)` |

### 8.2 Callback-Konvention

Immer `function(err, result)` — Node.js-Style.

```js
/* Erfolg */
callback(null, result);

/* Fehler */
callback(new Error('Beschreibung'), null);
```

Im Consumer-Code:
```js
AppService.getUser(uid, function(err, user) {
  if (err) {
    /* Fehler immer behandeln — niemals ignorieren */
    Toast.error('Fehler: ' + err.message);
    return;
  }
  /* user verwenden */
});
```

### 8.3 Fehler sind niemals still

Kein Adapter darf Fehler verschlucken. Wenn eine Operation fehlschlägt, muss `callback(error, null)` aufgerufen werden. Es ist die Aufgabe des Consumers, den Fehler anzuzeigen oder zu loggen.

---

## 9. Seed-Daten

Testdaten für den Mockup gehören ausschließlich in **`catalog-seed.js`** (oder eine gleichwertige Seed-Datei pro Feature-Bereich). Sie dürfen nicht in Consumer-Dateien, nicht in Store-Dateien und nicht im HTML eingebettet sein.

Der Seed prüft beim ersten Laden, ob Daten bereits existieren:

```js
AppService.getTeachers(function(err, teachers) {
  if (err || teachers.length > 0) return; /* Bereits geseeded */
  /* Seed-Daten einfügen */
});
```

Seed-Daten müssen:
- Realistische Werte enthalten (keine `"test"`, `"foo"`, `"123"`)
- Alle relevanten Felder abdecken, damit Filter testbar sind
- Die exakten Feld-Codes verwenden (`'de'` nicht `'Deutsch'`, `'beginner'` nicht `'Anfänger'`)

---

## 10. Dialoge und Overlays

Diese Regeln gelten zusätzlich zu den Präferenzen aus den Style-Guidelines:

- Dialoge und Overlays sind **immer eigenständige Objekte** (IIFE oder Objekt-Literal).
- Sie werden als **Standalone-HTML** in `/HTML/dialogs/` abgelegt.
- Ihr HTML wird per **XHR** geladen, nicht hardcodiert in die Hauptseite.
- Alle Fehler aus einem Overlay müssen **sichtbar** gemacht werden — nicht nur per `console.error`. Mindestens ein visueller Fehler-Dialog muss implementiert sein.
- Jedes Overlay hat einen `_showError(context, err)`-Mechanismus (siehe `catalog-filter-drawer.js` als Referenz).

---

## 11. i18n

- Jeder für den User sichtbare Text ist i18n-kompatibel.
- Standard-Sprache: **Deutsch**.
- Namespace = Name der aufrufenden `.html`-Seite (z.B. `skiing-catalog` für `skiing-catalog.html`).
- Strings werden in `/HTML/locales/[namespace].json` gespeichert.
- Dialoge und Overlays verwenden den Namespace der Seite, von der sie getriggert werden.
- Die JSON-Hierarchie ist so flach wie möglich — maximal eine Ebene.
- Kein sichtbarer Text darf hardcodiert im HTML oder JS stehen — immer als i18n-Schlüssel.

---

## 12. Vor jeder Implementierung

Bevor neuer Code geschrieben wird, sind folgende Schritte verpflichtend:

1. **Codebase prüfen** — Gibt es bereits eine Funktion, eine CSS-Klasse oder ein Template, das wiederverwendet werden kann?
2. **Schema prüfen** — Ist die neue Entität in `CRUD_SERVICE_REFERENCE_v2.md` dokumentiert oder muss sie ergänzt werden?
3. **Service-Methode prüfen** — Gibt es bereits eine `AppService`-Methode für diesen Zugriff?
4. **Best Practice recherchieren** — Für die gestellte Aufgabe nach dem aktuellen Stand der Technik recherchieren, bevor mit der Implementierung begonnen wird.

---

## 13. Migrations-Checkliste (Firestore)

Wenn die Migration von localStorage auf Firestore ansteht:

- [ ] Firebase SDK in allen HTML-Dateien einbinden
- [ ] `adapter-firestore.js` vollständig implementieren (Signaturen sind bereits definiert)
- [ ] Seed-Daten in Firestore importieren
- [ ] `app-config.js`: eine Zeile ändern (`LocalStorageAdapter` → `FirestoreAdapter`)
- [ ] `app_profiles`-Format prüfen: muss als flache Collection vorliegen (Migration-Script in `adapter-localstorage.js` vorhanden)
- [ ] End-to-End-Test aller Consumer-Seiten
- [ ] `adapter-localstorage.js` und `catalog-seed.js` aus Produktion entfernen

Kein Consumer-Code wird bei dieser Migration angefasst.

---

## 14. Zusammenfassung — Die fünf Kernregeln

1. **Kein direkter Store-Zugriff** im Consumer-Code — immer über `AppService`.
2. **Alles ist async** — Callbacks mit `function(err, result)`, immer, ausnahmslos.
3. **Eine Zeile** — der Adapter-Swap ist die einzige Änderung bei der Migration.
4. **Schema ist Firestore-kompatibel** — flache Collections, Array-Felder, Codes statt Klartexte.
5. **Seed-Daten** sind isoliert und realistisch — kein Testcode in Consumer-Dateien.
