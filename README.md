# Filetool

Dateien direkt im Browser konvertieren und bearbeiten — ohne Upload, ohne Server.
Progressive Web App (installierbar, offline-fähig).

## Status

Aktuell: **v0.9.2** — Accessibility- und Touch-Fixes nach gründlicher Code-Durchsicht.

**Neu in v0.9.2:**
- ♿ Zoom-Sperre entfernt (`user-scalable=no` verstößt gegen WCAG 1.4.4/1.4.10) — iOS-Auto-Zoom auf Eingabefeldern stattdessen gezielt über 16px-Mindestschriftgröße auf kleinen Bildschirmen verhindert
- 👆 Zu kleine Tipp-Ziele vergrößert (↑↓×-Buttons in Datei-Listen waren ~24px, jetzt 36px)
- 🐛 Kleines Memory-Leak beim Stapel-Export behoben (ZIP-Object-URL wurde nie freigegeben)

**v0.9.1 — drei Bugfixes:**

**Neu in v0.9.1:**
- 🐛 Hintergrund-Entfernen stürzte bei großen Fotos ohne Fehlermeldung ab — Bilder werden jetzt vor der Verarbeitung automatisch verkleinert, und ein Worker-Absturz zeigt jetzt eine echte Fehlermeldung statt endlos zu hängen
- 🐛 CI-Deploy schlug fehl: `onnxruntime-node`-Installationsskript (NuGet-Download) läuft nie gebraucht in reiner Browser-App — Workflow installiert jetzt mit `--ignore-scripts`
- 🐛 CI-Tests schlugen wegen Node-20/jsdom-Inkompatibilität fehl — Workflow läuft jetzt auf Node 22

**v0.9.0 — Komfort, Robustheit und drei neue Funktionen obendrauf:**

**Neu in dieser Version:**
- ✅ Bild-Vorschau (Original + Ergebnis) im Bilder-Modul
- ✅ Bilder zuschneiden (4 Seiten in %) und rotieren (90/180/270°) — auch als Preset speicherbar
- ✅ Reihenfolge per ↑↓ änderbar beim PDF-Zusammenführen und Bild→PDF
- ✅ Stapel-Verarbeitung: mehrere Bilder gleichzeitig reinziehen → gleiche Einstellungen auf alle anwenden → ZIP-Download
- ✅ Einheiten-Umrechner (Länge, Gewicht, Volumen, Temperatur) in den Extras
- ✅ **Hintergrund aus Bildern entfernen** (KI, läuft komplett lokal in einem eigenen Hintergrund-Thread)
- ✅ Zoom beim Antippen von Feldern behoben (Feld-Zoom + Pinch-Zoom komplett gesperrt)
- ✅ Testsuite (Vitest, 27 Tests) — läuft automatisch vor jedem Deploy, ein fehlgeschlagener Test verhindert das Live-Schalten
- ✅ Fortschrittsanzeige bei Audio/Video-Konvertierung gefixt (zeigte nach der ersten Datei keinen Fortschritt mehr)
- ✅ ffmpeg-Kern lädt jetzt von jsdelivr statt unpkg (zuverlässiger, u. a. mit Brave-Shields)

**Modul-Übersicht:**
- ✅ Bilder: JPG/PNG/WebP (beliebig untereinander), Zuschnitt, Rotation, Presets, Stapel-Verarbeitung, **+ zu PDF zusammenfügen, + Hintergrund entfernen**
- ✅ Tabellen: CSV/XLSX/JSON, beliebig in jede Richtung
- ✅ PDF: Zusammenführen (mit Reihenfolge), Seiten extrahieren (mehrere Bereiche gleichzeitig), Rotieren, In Bilder umwandeln, Text extrahieren (TXT/DOCX)
- ✅ DOCX: beide Richtungen — DOCX → Markdown/HTML/Text und Markdown/Text → DOCX
- ✅ Audio/Video: Format konvertieren, Schneiden, Ton aus Video extrahieren
- ✅ Extras: QR-Code, Base64/URL-Encoding, SHA-256-Hash, Einheiten-Umrechner
- ✅ Share-Target, Presets, Verlauf

**Zur Hintergrund-Entfernung — Lizenz-Entscheidung:**
Die naheliegende Bibliothek (`@imgly/background-removal`) steht unter **AGPL**, was
bedeutet hätte, dass der komplette Filetool-Quellcode ebenfalls AGPL-kompatibel
lizenziert sein müsste. Stattdessen verwendet Filetool **Transformers.js**
(Apache-2.0, von Hugging Face) mit dem **ormbg-Modell** (Apache-2.0) — lizenzsauber,
läuft komplett lokal, in einem eigenen Web-Worker (blockiert die Seite nicht). Das
Modell ist auf Fotos mit Personen/klaren Objekten optimiert, nicht auf beliebige
komplexe Szenen.

**Bewusste Grenzen (technisch im Browser nicht sauber machbar):**
- Kein direktes **PDF ↔ DOCX** mit voller Formatierung (Layout, Bilder, Tabellen)
- Kein PDF-Passwortschutz (pdf-lib unterstützt keine Verschlüsselung)
- HEIC/SVG als Bildformat werden nicht unterstützt
- Markdown → DOCX erkennt nur Überschriften, keine Fett-/Kursiv-Formatierung oder Listen
- Bild-Zuschnitt ist prozentual (Ränder abschneiden), kein freies Auswahlrechteck

> Hinweis: Das `xlsx`-Paket (SheetJS) hat eine bekannte, ungepatchte
> Sicherheitswarnung (Prototype Pollution / ReDoS) beim Einlesen böswillig
> präparierter Dateien. Da Filetool ausschließlich lokal mit deinen eigenen
> Dateien arbeitet, ist das Risiko hier gering.

> Hinweis: ffmpeg-Kern (~25 MB), pdf.js-Worker (~2 MB) und die onnxruntime-Laufzeit
> für die Hintergrund-Entfernung (~23 MB, plus Modellgewichte vom Hugging-Face-CDN)
> werden erst beim ersten Gebrauch nachgeladen und danach vom Service Worker gecacht.
> Erste Nutzung braucht also jeweils eine Internetverbindung und etwas Geduld.

> Hinweis: Share-Target funktioniert nur als installierte PWA, nicht im
> Browser-Tab, und **grundsätzlich nicht auf iPhone/iPad** — Apple hat diesen
> Teil des Web-Standards bis heute nicht implementiert (Stand 2026).

## Setup

```bash
npm install
npm run dev       # lokaler Dev-Server
npm run build      # Produktions-Build nach /dist
npm run preview    # Build lokal testen
```

## Deployment (GitHub Pages)

Bei jedem Push auf `main` baut eine GitHub-Actions-Workflow (`.github/workflows/deploy.yml`)
die App automatisch und veröffentlicht sie auf GitHub Pages.

Einmalig aktivieren: Repo → Settings → Pages → "Source" auf **GitHub Actions** stellen.
Die URL steht danach unter Settings → Pages bzw. im Actions-Log nach dem ersten Durchlauf.

## Tech-Stack

- Vite + React
- `vite-plugin-pwa` (Manifest + Service Worker, autoUpdate, Runtime-Caching für den ffmpeg-Kern)
- Selbst gehostete Fonts: Fraunces (Display/Serif), Inter (Fließtext), JetBrains Mono (Daten/Labels)
- Bilder: native `<canvas>`-API (keine zusätzliche Library)
- Tabellen: PapaParse (CSV) + SheetJS/xlsx (XLSX)
- PDF: pdf-lib (Merge/Split/Rotate, keine echte Verschlüsselung/Passwortschutz möglich) + pdf.js (Rendern zu Bildern, Text-Extraktion)
- DOCX: mammoth (Lesen) + turndown (HTML → Markdown) + docx (Erzeugen, für Markdown/Text → DOCX)
- Bild → PDF: pdf-lib (Bilder als Seiten einbetten)
- Audio/Video: ffmpeg.wasm (Single-Thread-Core vom CDN, keine COOP/COEP-Header nötig — läuft daher auch auf GitHub Pages)
- Extras: qrcode (QR-Generierung) + native Web-Crypto-API (SHA-256, kein zusätzliches Paket nötig)
- Hintergrund entfernen: `@huggingface/transformers` (Apache-2.0) + `onnx-community/ormbg-ONNX`-Modell (Apache-2.0), läuft in einem dedizierten Web Worker
- JSZip: bündelt mehrseitige/Stapel-Exporte in eine ZIP-Datei
- Error Boundary (React) fängt Laufzeitfehler einzelner Module ab
- Vitest: Unit-Tests für die reine Logik (Dateierkennung, PDF-Seitenbereiche, Presets, Verlauf)
- Eigener Service Worker (`src/sw.js`, `injectManifest`-Strategie) statt automatisch generiertem — nötig für die Share-Target-Logik
- Presets & Verlauf: `localStorage`, kein Backend nötig
- Alle Module bis auf Bilder sind per `React.lazy` code-gesplittet (laden nur bei Bedarf nach)
- Alle Konvertierungen laufen clientseitig (keine Datei verlässt das Gerät)

## Bekannte Installations-Eigenheit

`@huggingface/transformers` hat `onnxruntime-node` als Abhängigkeit, dessen
Installations-Skript versucht, eine Node-native Binärdatei von NuGet
herunterzuladen — die wird für diese reine Browser-App nie gebraucht. Falls
`npm install` mit einem NuGet-Fehler abbricht:

```bash
npm install --ignore-scripts
```

Der GitHub-Actions-Workflow installiert deshalb ebenfalls mit `npm ci --ignore-scripts` —
keines der tatsächlich benötigten Pakete braucht ein Install-Skript, betrifft also nur
das nie aufgerufene `onnxruntime-node`.

## Share-Target testen

1. App als PWA installieren (auf dem Handy: "Zum Startbildschirm hinzufügen"; am Desktop: Install-Icon in der Adressleiste).
2. In einer beliebigen anderen App eine Datei "teilen" (Share-Dialog des Betriebssystems öffnen).
3. Filetool sollte als Ziel in der Liste erscheinen. Auswählen — die App öffnet sich mit der Datei bereits im passenden Modul.

## Icons neu generieren

Quelle liegt in `scripts/icon-source.svg`. Nach Änderungen:

```bash
node scripts/generate-icons.mjs
```
