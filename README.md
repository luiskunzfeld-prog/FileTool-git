# Filetool

Dateien direkt im Browser konvertieren und bearbeiten — ohne Upload, ohne Server.
Progressive Web App (installierbar, offline-fähig).

## Status

Aktuell: **v0.8.0** — alle Module unterstützen jetzt so viele sinnvolle
Richtungen wie im Browser technisch sauber machbar sind, plus ein
Sicherheitsnetz gegen Abstürze/Einfrieren.

- ✅ Bilder: JPG / PNG / WebP (beliebig untereinander) **+ mehrere Bilder zu einem PDF zusammenfügen**
- ✅ Tabellen: CSV / XLSX / JSON, beliebig in jede Richtung
- ✅ PDF: Zusammenführen, Seiten extrahieren, Rotieren, **in Bilder umwandeln (PNG, pro Seite)**, **Text extrahieren (TXT/DOCX)**
- ✅ DOCX: **jetzt in beide Richtungen** — DOCX → Markdown/HTML/Text **und** Markdown/Text → DOCX (Überschriften werden erkannt)
- ✅ Audio/Video: Format konvertieren (MP3/WAV/OGG, MP4/WebM), Schneiden, Ton aus Video extrahieren (ffmpeg.wasm)
- ✅ Extras: QR-Code-Generator, Base64/URL-Encoding, SHA-256-Hash
- ✅ Share-Target, Presets, Verlauf

**Robustheit:**
- Error Boundary fängt Abstürze einzelner Module ab, statt die ganze App einzufrieren/weiß werden zu lassen — mit "Erneut versuchen"/"Neu laden"
- Warnhinweis bei sehr großen Audio/Video-Dateien (Speicherlimit des Browsers)
- Alle Module zeigen durchgängig einen Lade-/Verarbeitungs-Zustand, damit nie der Eindruck entsteht, die App reagiere nicht

**Bewusste Grenzen (technisch im Browser nicht sauber machbar):**
- Kein direktes **PDF ↔ DOCX** mit voller Formatierung (Layout, Bilder, Tabellen) — dafür bräuchte es eine vollständige Layout-Engine wie LibreOffice, die als WASM-Build zu groß/instabil für eine Web-App wäre. Der Umweg PDF → Text/DOCX bzw. Bild → PDF deckt die häufigsten Fälle ab.
- Kein PDF-Passwortschutz (pdf-lib unterstützt keine Verschlüsselung)
- HEIC/SVG als Bildformat werden nicht unterstützt (Browser-Limitierung bzw. bewusst ausgeschlossen)
- Markdown → DOCX erkennt nur Überschriften, keine Fett-/Kursiv-Formatierung oder Listen

> Hinweis: Das `xlsx`-Paket (SheetJS) hat eine bekannte, ungepatchte
> Sicherheitswarnung (Prototype Pollution / ReDoS) beim Einlesen böswillig
> präparierter Dateien. Da Filetool ausschließlich lokal mit deinen eigenen
> Dateien arbeitet, ist das Risiko hier gering — bei Bedarf lässt sich später
> auf eine gepatchte Version von cdn.sheetjs.com umsteigen.

> Hinweis: Der ffmpeg-Kern (~25 MB) und der pdf.js-Worker (~2 MB) werden beim
> ersten Gebrauch nachgeladen (nicht Teil des initialen Precache) und danach
> vom Service Worker gecacht, damit sie auch offline wiederverwendbar sind.
> Erste Nutzung braucht also eine Internetverbindung.

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
- PDF: pdf-lib (Merge/Split/Rotate, keine echte Verschlüsselung/Passwortschutz möglich) + pdf.js (Rendern zu Bildern, Text-Extraktion)
- DOCX: mammoth (Lesen) + turndown (HTML → Markdown) + docx (Erzeugen, für Markdown/Text → DOCX)
- Bild → PDF: pdf-lib (Bilder als Seiten einbetten)
- Audio/Video: ffmpeg.wasm (Single-Thread-Core vom CDN, keine COOP/COEP-Header nötig — läuft daher auch auf GitHub Pages)
- Extras: qrcode (QR-Generierung) + native Web-Crypto-API (SHA-256, kein zusätzliches Paket nötig)
- JSZip: bündelt mehrseitige PDF→Bild-Exporte in eine ZIP-Datei
- Error Boundary (React) fängt Laufzeitfehler einzelner Module ab
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
