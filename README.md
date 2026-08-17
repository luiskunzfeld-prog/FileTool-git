# Filetool

Dateien direkt im Browser konvertieren und bearbeiten — ohne Upload, ohne Server.
Progressive Web App (installierbar, offline-fähig).

## Status

Aktuell: **v0.3.0** — Phase 1 fertig. Bilder- und Tabellen-Konverter laufen
funktionsfähig direkt im Browser; die Drop-Zone erkennt den Dateityp
automatisch und zeigt das passende Modul.

- ✅ Bilder: JPG / PNG / WebP (per `<canvas>`, inkl. optionaler Breiten-Skalierung und Qualitätsregler)
- ✅ Tabellen: CSV / XLSX / JSON (PapaParse + SheetJS, per Lazy-Load nachgeladen)
- ⏳ Dokumente (PDF/DOCX)
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

## Tech-Stack

- Vite + React
- `vite-plugin-pwa` (Manifest + Service Worker, autoUpdate)
- Selbst gehostete Fonts: Fraunces (Display/Serif), Inter (Fließtext), JetBrains Mono (Daten/Labels)
- Bilder: native `<canvas>`-API (keine zusätzliche Library)
- Tabellen: PapaParse (CSV) + SheetJS/xlsx (XLSX), per `React.lazy` code-gesplittet
- Alle Konvertierungen laufen clientseitig (keine Datei verlässt das Gerät)

## Icons neu generieren

Quelle liegt in `scripts/icon-source.svg`. Nach Änderungen:

```bash
node scripts/generate-icons.mjs
```
