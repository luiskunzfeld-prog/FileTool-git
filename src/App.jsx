import { useCallback, useMemo, useState, lazy, Suspense } from 'react'
import './App.css'
import { categorize } from './lib/fileCategory'
import ImageConverter from './components/ImageConverter'

const TableConverter = lazy(() => import('./components/TableConverter'))

const MODULES = [
  {
    id: 'bilder',
    label: 'Bilder',
    tags: ['JPG', 'PNG', 'WebP'],
    status: 'live',
  },
  {
    id: 'dokumente',
    label: 'Dokumente',
    tags: ['PDF', 'DOCX', 'Merge', 'Split'],
    status: 'geplant',
  },
  {
    id: 'tabellen',
    label: 'Tabellen',
    tags: ['CSV', 'XLSX', 'JSON'],
    status: 'live',
  },
  {
    id: 'av',
    label: 'Audio · Video',
    tags: ['MP3', 'MP4', 'Trim'],
    status: 'geplant',
  },
  {
    id: 'extras',
    label: 'Extras',
    tags: ['QR-Code', 'Encoding', 'Hash'],
    status: 'geplant',
  },
]

const STATUS_LABEL = {
  live: 'AKTIV',
  bau: 'IN BAU',
  geplant: 'GEPLANT',
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DropPort() {
  const [isOver, setIsOver] = useState(false)
  const [file, setFile] = useState(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsOver(false), [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }, [])

  const handlePick = useCallback((e) => {
    const picked = e.target.files?.[0]
    if (picked) setFile(picked)
  }, [])

  const category = useMemo(() => (file ? categorize(file) : null), [file])

  return (
    <div
      className={`drop-port${isOver ? ' drop-port--over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="drop-port__bracket drop-port__bracket--tl" aria-hidden="true" />
      <span className="drop-port__bracket drop-port__bracket--tr" aria-hidden="true" />
      <span className="drop-port__bracket drop-port__bracket--bl" aria-hidden="true" />
      <span className="drop-port__bracket drop-port__bracket--br" aria-hidden="true" />

      {!file ? (
        <label className="drop-port__prompt">
          <input type="file" onChange={handlePick} hidden />
          <span className="drop-port__title">Datei hier ablegen</span>
          <span className="drop-port__hint">oder klicken zum Auswählen</span>
        </label>
      ) : (
        <div className="drop-port__readout" key={file.name + file.size}>
          <div className="readout-row">
            <span className="readout-label">NAME</span>
            <span className="readout-value">{file.name}</span>
          </div>
          <div className="readout-row">
            <span className="readout-label">TYP</span>
            <span className="readout-value">{file.type || 'unbekannt'}</span>
          </div>
          <div className="readout-row">
            <span className="readout-label">GRÖSSE</span>
            <span className="readout-value">{formatBytes(file.size)}</span>
          </div>

          {category === 'image' && <ImageConverter file={file} />}
          {category === 'table' && (
            <Suspense fallback={<p className="readout-status">Lade Tabellen-Modul…</p>}>
              <TableConverter file={file} />
            </Suspense>
          )}
          {category === 'unknown' && (
            <div className="readout-status">
              Für diesen Dateityp gibt es noch kein Modul — folgt in einer späteren Phase
            </div>
          )}

          <button className="readout-reset" onClick={() => setFile(null)}>
            Andere Datei wählen
          </button>
        </div>
      )}
    </div>
  )
}

function ModuleGrid() {
  return (
    <div className="module-grid">
      {MODULES.map((m) => (
        <div className="module-card" key={m.id}>
          <div className="module-card__top">
            <span className={`led led--${m.status}`} aria-hidden="true" />
            <span className="module-card__status">{STATUS_LABEL[m.status]}</span>
          </div>
          <h3 className="module-card__label">{m.label}</h3>
          <div className="module-card__tags">
            {m.tags.map((t) => (
              <span className="tag" key={t}>{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__brand">
          <svg width="20" height="20" viewBox="0 0 512 512" aria-hidden="true">
            <path d="M 150 130 L 130 130 L 130 150" stroke="#C9A86A" strokeWidth="34" strokeLinecap="round" fill="none" />
            <path d="M 362 130 L 382 130 L 382 150" stroke="#C9A86A" strokeWidth="34" strokeLinecap="round" fill="none" />
            <path d="M 150 382 L 130 382 L 130 362" stroke="#C9A86A" strokeWidth="34" strokeLinecap="round" fill="none" />
            <path d="M 362 382 L 382 382 L 382 362" stroke="#C9A86A" strokeWidth="34" strokeLinecap="round" fill="none" />
          </svg>
          <span className="topbar__wordmark">FILETOOL</span>
        </div>
        <div className="topbar__status">
          <span className="pulse-dot" aria-hidden="true" />
          SYSTEM BEREIT
        </div>
      </header>

      <main className="workbench">
        <section className="workbench__intro">
          <h1>Dateien umwandeln, direkt im Browser.</h1>
          <p>Kein Upload, keine Server-Verarbeitung. Alles läuft lokal auf deinem Gerät.</p>
        </section>

        <DropPort />

        <section className="workbench__modules">
          <h2>Module</h2>
          <ModuleGrid />
        </section>
      </main>

      <footer className="footer">
        <span>Läuft vollständig im Browser · keine Uploads</span>
        <span className="footer__version">v0.3.0 · Phase 1</span>
      </footer>
    </>
  )
}
