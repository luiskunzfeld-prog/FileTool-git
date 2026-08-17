# Filetool

Dateien direkt im Browser konvertieren und bearbeiten — ohne Upload, ohne Server.
Progressive Web App (installierbar, offline-fähig).

## Status

Aktuell: **v0.7.0** — Phase 1–5 fertig, damit ist der ursprüngliche Plan
komplett umgesetzt. Bilder, Tabellen, PDF, DOCX, Audio/Video und Extras
laufen alle funktionsfähig direkt im Browser; dazu Share-Target, Presets und
ein Verlauf.

- ✅ Bilder: JPG / PNG / WebP (per `<canvas>`, inkl. Breiten-Skalierung, Qualitätsregler und speicherbaren Presets)
- ✅ Tabellen: CSV / XLSX / JSON (PapaParse + SheetJS, per Lazy-Load nachgeladen)
- ✅ PDF: Seiten extrahieren, mehrere PDFs zusammenführen, Seiten rotieren (pdf-lib)
- ✅ DOCX: Umwandeln in Markdown / HTML / Text (mammoth + turndown)
- ✅ Audio/Video: Format konvertieren (MP3/WAV/OGG, MP4/WebM), Schneiden, Ton aus Video extrahieren (ffmpeg.wasm)
- ✅ Extras: QR-Code-Generator, Base64/URL-Encoding, SHA-256-Hash
- ✅ Share-Target: "Teilen an Filetool" aus anderen Apps (Android/Desktop, nach Installation als PWA)
- ✅ Presets: Bild-Einstellungen als benannte Presets speichern/laden (Bilder-Modul)
- ✅ Verlauf: letzte Konvertierungen lokal sichtbar (nur Metadaten, keine Dateien)

> Hinweis: Das `xlsx`-Paket (SheetJS) hat eine bekannte, ungepatchte
> Sicherheitswarnung (Prototype Pollution / ReDoS) beim Einlesen böswillig
> präparierter Dateien. Da Filetool ausschließlich lokal mit deinen eigenen
> Dateien arbeitet, ist das Risiko hier gering — bei Bedarf lässt sich später
> auf eine gepatchte Version von cdn.sheetjs.com umsteigen.

> Hinweis: Der ffmpeg-Kern (~25 MB) wird beim ersten Gebrauch von unpkg.com
> nachgeladen (nicht Teil des eigenen Builds) und danach vom Service Worker
> gecacht, damit er auch offline wiederverwendbar ist. Erste Nutzung braucht
> also eine Internetverbindung und etwas Geduld.

> Hinweis: Share-Target funktioniert nur, wenn die App als PWA installiert
> ist (Homescreen/Desktop-Icon), nicht in einem normalen Browser-Tab — das
> ist eine Einschränkung der Web-Plattform, keine Filetool-Eigenheit.

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
- PDF: pdf-lib (Merge/Split/Rotate, keine echte Verschlüsselung/Passwortschutz möglich)
- DOCX: mammoth (Einlesen) + turndown (HTML → Markdown)
- Audio/Video: ffmpeg.wasm (Single-Thread-Core vom CDN, keine COOP/COEP-Header nötig — läuft daher auch auf GitHub Pages)
- Extras: qrcode (QR-Generierung) + native Web-Crypto-API (SHA-256, kein zusätzliches Paket nötig)
- Eigener Service Worker (`src/sw.js`, `injectManifest`-Strategie) statt automatisch generiertem — nötig für die Share-Target-Logik
- Presets & Verlauf: `localStorage`, kein Backend nötig

## Share-Target testen

1. App als PWA installieren (auf dem Handy: "Zum Startbildschirm hinzufügen"; am Desktop: Install-Icon in der Adressleiste).
2. In einer beliebigen anderen App eine Datei "teilen" (Share-Dialog des Betriebssystems öffnen).
3. Filetool sollte als Ziel in der Liste erscheinen. Auswählen — die App öffnet sich mit der Datei bereits im passenden Modul.
- Alle Module bis auf Bilder sind per `React.lazy` code-gesplittet (laden nur bei Bedarf nach)
- Alle Konvertierungen laufen clientseitig (keine Datei verlässt das Gerät)

## Icons neu generieren

Quelle liegt in `scripts/icon-source.svg`. Nach Änderungen:

```bash
node scripts/generate-icons.mjs
```
