# Architectural Guidelines: Asset Versioning & Cache-Strategie

> **Ziel:** Browser erkennen automatisch neue Versionen von JS/CSS-Dateien.
> Manuelles Cache-Leeren ist verboten — es ist ein Symptom fehlender Architektur, kein Workaround.

---

## 1. Grundprinzip (Non-Negotiable)

Jede statische Ressource (JavaScript, CSS, Fonts, Bilder) **MUSS** mit einem Versionsbezeichner
referenziert werden.

Direkte Dateireferenzen ohne Versionsidentifikator sind **strikt verboten**.

```html
<!-- ❌ VERBOTEN -->
<script src="app.js"></script>
<link rel="stylesheet" href="styles.css">

<!-- ✅ PFLICHT -->
<script src="app.js?v=1.2.0"></script>
<link rel="stylesheet" href="styles.css?v=1.2.0">
```

---

## 2. Versionierungsstrategien

### Strategie A — Query-Based Versioning (ohne Build-Tool)

Geeignet für: kleine Projekte, reine HTML/CSS/JS-Projekte ohne Build-Pipeline.

```html
<script src="app.js?v=2026-03-19-1"></script>
<link rel="stylesheet" href="styles.css?v=2026-03-19-1">
```

**Pflichtregeln:**
- Die Version **muss** bei jeder inhaltlichen Änderung der Datei erhöht werden.
- Empfohlenes Format: `YYYY-MM-DD-{increment}` (z. B. `2026-03-19-2`).
- Die aktuelle Version wird in einer zentralen Konfigurationsdatei (`version.js` oder `config.js`)
  definiert und von dort in alle HTML-Dateien eingebunden.

**Zentrale Versionskonstante:**

```javascript
// config.js
const APP_VERSION = '2026-03-19-1';
```

```html
<!-- Korrekte Einbindung über eine zentrale Konstante -->
<script src="config.js"></script>
<script>
  document.querySelector('#main-script').src = `app.js?v=${APP_VERSION}`;
</script>
```

> Alternativ: Versions-Tag direkt im HTML pflegen — aber **nur an einer einzigen Stelle**
> pro Projekt (z. B. in einem zentralen `head`-Template oder `_includes/head.html`).

---

### Strategie B — Content-Hash Versioning (mit Build-Tool, empfohlen für Production)

Geeignet für: alle Projekte mit Build-Pipeline (Vite, Webpack, Parcel).

```
app.a1b2c3d4.js
styles.xyz78910.css
```

Der Hash wird **automatisch aus dem Dateiinhalt** generiert.
Ändert sich auch nur ein Zeichen in der Datei, ändert sich der Hash → Browser lädt neu.

**Vite-Konfiguration (Beispiel):**

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      }
    }
  }
};
```

> Strategie B ist der **Standard für alle produktiven Deployments**.
> Strategie A ist ausschließlich für Entwicklung ohne Build-Tool zulässig.

---

## 3. Cache-Control Header (Server-Konfiguration)

### Für versionierte Assets (Strategie A & B):

```
Cache-Control: public, max-age=31536000, immutable
```

→ Browser cached die Datei dauerhaft — aber da der Dateiname/Query-Parameter eindeutig ist,
wird bei einer neuen Version automatisch eine neue Anfrage gestellt.

### Für HTML-Dateien (nie cachen):

```
Cache-Control: no-cache, no-store, must-revalidate
```

→ Das HTML (das die Asset-Referenzen enthält) wird **immer** frisch geladen.
So stellt der Browser sicher, dass er immer die aktuellsten Asset-Referenzen kennt.

### Nginx-Beispiel:

```nginx
# HTML: nie cachen
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# Assets: dauerhaft cachen (sind versioniert)
location ~* \.(js|css|woff2|png|svg)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Apache `.htaccess`-Beispiel:

```apache
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>

<FilesMatch "\.(js|css|woff2|png|svg)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

---

## 4. Pflichtregeln (Zusammenfassung)

| Regel | Beschreibung |
|---|---|
| **R-CACHE-01** | Jede JS- und CSS-Datei MUSS mit einem Versionsbezeichner referenziert werden. |
| **R-CACHE-02** | Unversionierte Asset-Referenzen sind in keiner Umgebung erlaubt. |
| **R-CACHE-03** | Bei jeder inhaltlichen Änderung einer Asset-Datei MUSS die Version erhöht werden. |
| **R-CACHE-04** | HTML-Dateien dürfen NICHT gecacht werden (no-cache Header Pflicht auf Server). |
| **R-CACHE-05** | Die Versionskonstante wird zentral verwaltet — niemals dupliziert. |
| **R-CACHE-06** | In Produktionsumgebungen MUSS Strategie B (Content-Hash) verwendet werden. |
| **R-CACHE-07** | Manuelles Cache-Leeren gilt als Architektur-Fehler und MUSS durch Versionierung behoben werden. |
| **R-CACHE-08** | Drittanbieter-Libraries werden ausschließlich über CDN-Links mit fixer Versionsangabe eingebunden (z. B. `?v=3.4.1`). |

---

## 5. Verbotene Praktiken (Anti-Patterns)

```html
<!-- ❌ Keine Version — Browser cached die alte Datei -->
<script src="main.js"></script>

<!-- ❌ Datum ohne Increment — zwei Änderungen am selben Tag werden nicht erkannt -->
<script src="main.js?v=2026-03-19"></script>

<!-- ❌ Zufallszahl bei jedem Load — verhindert Caching komplett, schädlich für Performance -->
<script src="main.js?v=${Math.random()}"></script>

<!-- ❌ Manuelle Anweisung "Cache leeren" im README — ist kein Workaround, ist ein Fehler -->
```

---

## 6. Projekt-Checkliste (vor jedem Deployment)

- [ ] Alle `<script src="">` enthalten `?v=` oder Content-Hash
- [ ] Alle `<link rel="stylesheet" href="">` enthalten `?v=` oder Content-Hash
- [ ] Versionskonstante wurde bei dieser Änderung aktualisiert
- [ ] HTML-Dateien sind auf Server mit `no-cache` konfiguriert
- [ ] Kein Asset wird ohne Versionsbezeichner referenziert
- [ ] Bei Build-Tool: Vite/Webpack erzeugt Hashes automatisch (Konfiguration geprüft)

---

## 7. Empfohlene Projektstruktur (ohne Build-Tool)

```
project/
├── config.js           ← Zentrale Version: APP_VERSION = '2026-03-19-1'
├── index.html          ← lädt config.js zuerst, dann alle Assets mit ?v=${APP_VERSION}
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── assets/
    └── ...
```

**Ablauf bei einer Änderung:**
1. Datei ändern (z. B. `app.js`)
2. `APP_VERSION` in `config.js` erhöhen (z. B. `2026-03-19-2`)
3. Deployen — fertig. Kein Cache-Leeren notwendig.

---

*Diese Guidelines gelten für alle HTML/CSS/JS-Projekte ohne Ausnahme.*
*Verstöße gegen R-CACHE-01 bis R-CACHE-08 sind vor dem Deployment zu beheben.*
