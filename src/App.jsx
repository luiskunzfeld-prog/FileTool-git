import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import './App.css'
import { categorize } from './lib/fileCategory'
import { hasShareParam, clearShareParam, consumeSharedFile } from './lib/shareTarget'
import ImageConverter from './components/ImageConverter'
import ExtrasPanel from './components/ExtrasPanel'
import HistoryPanel from './components/HistoryPanel'

const TableConverter = lazy(() => import('./components/TableConverter'))
const PdfToolkit = lazy(() => import('./components/PdfToolkit'))
const DocxConverter = lazy(() => import('./components/DocxConverter'))
const AvConverter = lazy(() => import('./components/AvConverter'))
const ImageBatchConverter = lazy(() => import('./components/ImageBatchConverter'))

const MODULES = [
  {
    id: 'bilder',
    label: 'Bilder',
    tags: ['JPG', 'PNG', 'WebP', 'PDF', 'Freistellen'],
    status: 'live',
  },
  {
    id: 'dokumente',
    label: 'Dokumente',
    tags: ['PDF', 'DOCX', 'Bilder', 'Text'],
    status: 'live',
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
    status: 'live',
  },
  {
    id: 'extras',
    label: 'Extras',
    tags: ['QR-Code', 'Base64', 'Umrechner'],
    status: 'live',
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
  const [batchFiles, setBatchFiles] = useState(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsOver(false), [])

  const acceptFiles = useCallback((fileList) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    if (files.length > 1 && files.every((f) => categorize(f) === 'image')) {
      setBatchFiles(files)
      setFile(null)
    } else {
      setFile(files[0])
      setBatchFiles(null)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsOver(false)
    acceptFiles(e.dataTransfer.files)
  }, [acceptFiles])

  const handlePick = useCallback((e) => {
    acceptFiles(e.target.files)
  }, [acceptFiles])

  useEffect(() => {
    if (!hasShareParam()) return
    consumeSharedFile().then((sharedFile) => {
      if (sharedFile) setFile(sharedFile)
      clearShareParam()
    })
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

      {!file && !batchFiles ? (
        <label className="drop-port__prompt">
          <input type="file" onChange={handlePick} multiple hidden />
          <span className="drop-port__title">Datei hier ablegen</span>
          <span className="drop-port__hint">oder klicken zum Auswählen (auch mehrere Bilder gleichzeitig)</span>
        </label>
      ) : batchFiles ? (
        <div className="drop-port__readout" key={`batch-${batchFiles.length}-${batchFiles[0].name}`}>
          <div className="readout-row">
            <span className="readout-label">STAPEL</span>
            <span className="readout-value">{batchFiles.length} Bilder</span>
          </div>
          <Suspense fallback={<p className="readout-status">Lade Bilder-Modul…</p>}>
            <ImageBatchConverter files={batchFiles} />
          </Suspense>
          <button className="readout-reset" onClick={() => setBatchFiles(null)}>
            Andere Dateien wählen
          </button>
        </div>
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
          {category === 'pdf' && (
            <Suspense fallback={<p className="readout-status">Lade PDF-Modul…</p>}>
              <PdfToolkit file={file} />
            </Suspense>
          )}
          {category === 'docx' && (
            <Suspense fallback={<p className="readout-status">Lade DOCX-Modul…</p>}>
              <DocxConverter file={file} />
            </Suspense>
          )}
          {category === 'av' && (
            <Suspense fallback={<p className="readout-status">Lade Audio/Video-Modul…</p>}>
              <AvConverter file={file} />
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

        <section className="workbench__extras">
          <h2>Extras</h2>
          <ExtrasPanel />
        </section>

        <HistoryPanel />
      </main>

      <footer className="footer">
        <span>Läuft vollständig im Browser · keine Uploads</span>
        <span className="footer__version">v0.9.0</span>
      </footer>
    </>
  )
}
