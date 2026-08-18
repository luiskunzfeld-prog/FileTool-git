import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { addHistoryEntry } from '../lib/history'

function stripExtension(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function loadImageBitmap(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { resolve(img); URL.revokeObjectURL(url) }
    img.onerror = () => { reject(new Error(`"${file.name}" konnte nicht als Bild gelesen werden.`)); URL.revokeObjectURL(url) }
    img.src = url
  })
}

// Zeichnet ein beliebiges Bild (auch WebP) auf ein <canvas> und liefert PNG-Bytes zurück,
// damit pdf-lib es zuverlässig einbetten kann (pdf-lib versteht nativ nur JPG/PNG).
async function toPngBytes(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d').drawImage(img, 0, 0)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}

async function buildPdfFromImages(files) {
  const doc = await PDFDocument.create()
  for (const file of files) {
    const img = await loadImageBitmap(file)
    const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name)
    let embedded
    if (isJpeg) {
      embedded = await doc.embedJpg(new Uint8Array(await file.arrayBuffer()))
    } else if (file.type === 'image/png') {
      embedded = await doc.embedPng(new Uint8Array(await file.arrayBuffer()))
    } else {
      embedded = await doc.embedPng(await toPngBytes(img))
    }
    const page = doc.addPage([embedded.width, embedded.height])
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
  }
  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

export default function ImageToPdf({ file }) {
  const [extraFiles, setExtraFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const objectUrlRef = useRef(null)

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

  const removeExtra = (idx) => setExtraFiles((prev) => prev.filter((_, i) => i !== idx))

  const moveExtra = (idx, dir) => {
    setExtraFiles((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const handleConvert = async () => {
    setStatus('converting')
    setErrorMsg('')
    try {
      const blob = await buildPdfFromImages([file, ...extraFiles])
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const name = `${stripExtension(file.name)}.pdf`
      setResult({ url, blob, name })
      setStatus('done')
      addHistoryEntry({ module: 'Bilder', detail: `→ PDF (${extraFiles.length + 1} Seiten)`, fileName: name })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'PDF konnte nicht erzeugt werden.')
    }
  }

  return (
    <>
      <div className="converter__field">
        <span>Reihenfolge: {file.name} zuerst, dann die Liste unten (mit ↑↓ sortierbar)</span>
        <label className="converter__filepick">
          <input type="file" accept="image/*" multiple onChange={handleAddExtra} hidden />
          Bilder hinzufügen
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

      <button className="converter__action" onClick={handleConvert} disabled={status === 'converting'}>
        {status === 'converting' ? 'Erzeuge PDF…' : `PDF erzeugen (${extraFiles.length + 1} Seite${extraFiles.length ? 'n' : ''})`}
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
    </>
  )
}
