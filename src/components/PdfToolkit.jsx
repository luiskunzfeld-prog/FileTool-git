import { useEffect, useRef, useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import JSZip from 'jszip'
import { Document, Packer, Paragraph } from 'docx'
import { addHistoryEntry } from '../lib/history'
import { rangesToIndices } from '../lib/pdfRanges'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const ACTIONS = [
  { value: 'extract', label: 'Seiten extrahieren' },
  { value: 'merge', label: 'Zusammenführen' },
  { value: 'rotate', label: 'Rotieren' },
  { value: 'to-images', label: 'In Bilder umwandeln' },
  { value: 'to-text', label: 'Text extrahieren' },
]

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stripExtension(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

async function buildDocxFromPages(pages) {
  const paragraphs = []
  pages.forEach((pageText, i) => {
    pageText.split(/\r?\n/).forEach((line) => paragraphs.push(new Paragraph({ text: line })))
    if (i < pages.length - 1) paragraphs.push(new Paragraph({ text: '' }))
  })
  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBlob(doc)
}

export default function PdfToolkit({ file }) {
  const [action, setAction] = useState('extract')
  const [pageCount, setPageCount] = useState(null)
  const [ranges, setRanges] = useState([{ id: 1, from: '', to: '' }])
  const [rotation, setRotation] = useState(90)
  const [extraFiles, setExtraFiles] = useState([])
  const [textTarget, setTextTarget] = useState('txt')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    file.arrayBuffer()
      .then((buf) => PDFDocument.load(buf))
      .then((doc) => {
        if (!cancelled) setPageCount(doc.getPageCount())
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg('PDF konnte nicht gelesen werden — evtl. beschädigt oder passwortgeschützt.')
        }
      })
    return () => { cancelled = true }
  }, [file])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleAddExtra = (e) => {
    const picked = Array.from(e.target.files ?? [])
    setExtraFiles((prev) => [...prev, ...picked])
    setStatus('idle')
  }

  const removeExtra = (idx) => {
    setExtraFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveExtra = (idx, dir) => {
    setExtraFiles((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const addRange = () => {
    setRanges((prev) => [...prev, { id: Date.now(), from: '', to: '' }])
  }

  const updateRange = (id, field, value) => {
    setRanges((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    setStatus('idle')
  }

  const removeRange = (id) => {
    setRanges((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  const finish = (blob, name, historyDetail) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    setResult({ url, blob, name })
    setStatus('done')
    addHistoryEntry({ module: 'Dokumente', detail: historyDetail, fileName: name })
  }

  const handleRun = async () => {
    setStatus('converting')
    setErrorMsg('')
    try {
      if (action === 'extract') {
        const srcBytes = await file.arrayBuffer()
        const srcDoc = await PDFDocument.load(srcBytes)
        const indices = rangesToIndices(ranges, srcDoc.getPageCount())
        const outDoc = await PDFDocument.create()
        const pages = await outDoc.copyPages(srcDoc, indices)
        pages.forEach((p) => outDoc.addPage(p))
        const bytes = await outDoc.save()
        finish(new Blob([bytes], { type: 'application/pdf' }), `${stripExtension(file.name)}-auszug.pdf`, 'Seiten extrahiert')
      } else if (action === 'rotate') {
        const srcBytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(srcBytes)
        doc.getPages().forEach((p) => p.setRotation(degrees(rotation)))
        const bytes = await doc.save()
        finish(new Blob([bytes], { type: 'application/pdf' }), `${stripExtension(file.name)}-rotiert.pdf`, 'Rotiert')
      } else if (action === 'merge') {
        const outDoc = await PDFDocument.create()
        const allFiles = [file, ...extraFiles]
        for (const f of allFiles) {
          const bytes = await f.arrayBuffer()
          const srcDoc = await PDFDocument.load(bytes)
          const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices())
          pages.forEach((p) => outDoc.addPage(p))
        }
        const bytes = await outDoc.save()
        finish(new Blob([bytes], { type: 'application/pdf' }), `${stripExtension(file.name)}-zusammengefuehrt.pdf`, 'Zusammengeführt')
      } else if (action === 'to-images') {
        const buffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        const pageBlobs = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
          pageBlobs.push(blob)
        }
        if (pageBlobs.length === 1) {
          finish(pageBlobs[0], `${stripExtension(file.name)}-seite-1.png`, 'In Bild umgewandelt')
        } else {
          const zip = new JSZip()
          pageBlobs.forEach((blob, i) => zip.file(`seite-${i + 1}.png`, blob))
          const zipBlob = await zip.generateAsync({ type: 'blob' })
          finish(zipBlob, `${stripExtension(file.name)}-seiten.zip`, `${pageBlobs.length} Seiten als Bilder`)
        }
      } else if (action === 'to-text') {
        const buffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        const pages = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          pages.push(content.items.map((item) => item.str).join(' '))
        }
        if (textTarget === 'docx') {
          const blob = await buildDocxFromPages(pages)
          finish(blob, `${stripExtension(file.name)}.docx`, 'Text → DOCX')
        } else {
          const blob = new Blob([pages.join('\n\n')], { type: 'text/plain' })
          finish(blob, `${stripExtension(file.name)}.txt`, 'Text extrahiert')
        }
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Konnte PDF nicht verarbeiten.')
    }
  }

  return (
    <div className="converter">
      <label className="converter__field">
        <span>Aktion</span>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setStatus('idle')
          }}
        >
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </label>

      {pageCount !== null && (
        <p className="converter__hint">{pageCount} Seiten erkannt</p>
      )}

      {action === 'extract' && (
        <div className="converter__field">
          <span>Seiten (leer lassen bei "Bis" für nur eine Seite)</span>
          <div className="range-list">
            {ranges.map((r) => (
              <div className="range-row" key={r.id}>
                <input
                  type="number"
                  className="range-row__input"
                  placeholder="Von"
                  min="1"
                  value={r.from}
                  onChange={(e) => updateRange(r.id, 'from', e.target.value)}
                />
                <span className="range-row__sep">bis</span>
                <input
                  type="number"
                  className="range-row__input"
                  placeholder="= Von"
                  min="1"
                  value={r.to}
                  onChange={(e) => updateRange(r.id, 'to', e.target.value)}
                />
                {ranges.length > 1 && (
                  <button
                    type="button"
                    className="range-row__remove"
                    onClick={() => removeRange(r.id)}
                    aria-label="Bereich entfernen"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="converter__preset-link" onClick={addRange}>
            + weiteren Bereich hinzufügen
          </button>
        </div>
      )}

      {action === 'rotate' && (
        <label className="converter__field">
          <span>Rotation</span>
          <select
            value={rotation}
            onChange={(e) => {
              setRotation(Number(e.target.value))
              setStatus('idle')
            }}
          >
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </label>
      )}

      {action === 'merge' && (
        <div className="converter__field">
          <span>Reihenfolge: {file.name} zuerst, dann die Liste unten (mit ↑↓ sortierbar)</span>
          <label className="converter__filepick">
            <input type="file" accept=".pdf" multiple onChange={handleAddExtra} hidden />
            Dateien hinzufügen
          </label>
          {extraFiles.length > 0 && (
            <ul className="converter__filelist">
              {extraFiles.map((f, i) => (
                <li key={f.name + i}>
                  <span>{f.name}</span>
                  <span className="converter__filelist-actions">
                    <button type="button" onClick={() => moveExtra(i, -1)} disabled={i === 0} aria-label={`${f.name} nach oben`}>↑</button>
                    <button type="button" onClick={() => moveExtra(i, 1)} disabled={i === extraFiles.length - 1} aria-label={`${f.name} nach unten`}>↓</button>
                    <button type="button" onClick={() => removeExtra(i)} aria-label={`${f.name} entfernen`}>×</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {action === 'to-images' && (
        <p className="converter__hint">
          Jede Seite wird als PNG exportiert (mehrere Seiten → ZIP-Datei).
          {pageCount > 25 && ' Bei vielen Seiten kann das eine Weile dauern.'}
        </p>
      )}

      {action === 'to-text' && (
        <label className="converter__field">
          <span>Zielformat</span>
          <select
            value={textTarget}
            onChange={(e) => {
              setTextTarget(e.target.value)
              setStatus('idle')
            }}
          >
            <option value="txt">Text (.txt)</option>
            <option value="docx">Word (.docx)</option>
          </select>
        </label>
      )}

      <button
        className="converter__action"
        onClick={handleRun}
        disabled={status === 'converting' || pageCount === null}
      >
        {status === 'converting' ? 'Verarbeite…' : 'Ausführen'}
      </button>

      {status === 'error' && <p className="converter__error">{errorMsg}</p>}

      {status === 'done' && result && (
        <div className="converter__result">
          <div className="readout-row">
            <span className="readout-label">GRÖSSE</span>
            <span className="readout-value">{formatBytes(result.blob.size)}</span>
          </div>
          <a className="converter__download" href={result.url} download={result.name}>
            {result.name} herunterladen
          </a>
        </div>
      )}
    </div>
  )
}
