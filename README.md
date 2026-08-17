# Filetool

Dateien direkt im Browser konvertieren und bearbeiten — ohne Upload, ohne Server.
Progressive Web App (installierbar, offline-fähig).

## Status

Aktuell: **v0.4.0** — Phase 1 + 2 fertig. Bilder, Tabellen, PDF und DOCX laufen
funktionsfähig direkt im Browser; die Drop-Zone erkennt den Dateityp
automatisch und zeigt das passende Modul.

- ✅ Bilder: JPG / PNG / WebP (per `<canvas>`, inkl. optionaler Breiten-Skalierung und Qualitätsregler)
- ✅ Tabellen: CSV / XLSX / JSON (PapaParse + SheetJS, per Lazy-Load nachgeladen)
- ✅ PDF: Seiten extrahieren, mehrere PDFs zusammenführen, Seiten rotieren (pdf-lib)
- ✅ DOCX: Umwandeln in Markdown / HTML / Text (mammoth + turndown)
- ⏳ Audio/Video (ffmpeg.wasm)
- ⏳ Extras (QR-Code, Hintergrund entfernen, Encoding-Tools)
- ⏳ PWA-Politur (Share-Target, Presets, Verlauf)

> Hinweis: Das `xlsx`-Paket (SheetJS) hat eine bekannte, ungepatchte
> Sicherheitswarnung (Prototype Pollution / ReDoS) beim Einlesen böswillig
> präparierter Dateien. Da Filetool ausschließlich lokal mit deinen eigenen
> Dateien arbeitet, ist das Risiko hier gering — bei Bedarf lässt sich später
> auf eine gepatchte Version von cdn.sheetjs.com umsteigen.

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
- `vite-plugin-pwa` (Manifest + Service Worker, autoUpdate)
- Selbst gehostete Fonts: Fraunces (Display/Serif), Inter (Fließtext), JetBrains Mono (Daten/Labels)
- Bilder: native `<canvas>`-API (keine zusätzliche Library)
- Tabellen: PapaParse (CSV) + SheetJS/xlsx (XLSX)
- PDF: pdf-lib (Merge/Split/Rotate, keine echte Verschlüsselung/Passwortschutz möglich)
- DOCX: mammoth (Einlesen) + turndown (HTML → Markdown)
- Alle Module bis auf Bilder sind per `React.lazy` code-gesplittet (laden nur bei Bedarf nach)
- Alle Konvertierungen laufen clientseitig (keine Datei verlässt das Gerät)

## Icons neu generieren

Quelle liegt in `scripts/icon-source.svg`. Nach Änderungen:

```bash
node scripts/generate-icons.mjs
```
