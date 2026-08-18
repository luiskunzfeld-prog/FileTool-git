import { useState } from 'react'
import JSZip from 'jszip'
import { addHistoryEntry } from '../lib/history'

const FORMATS = [
  { value: 'image/png', label: 'PNG', ext: 'png', lossy: false },
  { value: 'image/jpeg', label: 'JPG', ext: 'jpg', lossy: true },
  { value: 'image/webp', label: 'WebP', ext: 'webp', lossy: true },
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

function convertOne(file, targetFormat, quality, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const limit = Number(maxWidth)
      if (limit > 0 && width > limit) {
        height = Math.round((height * limit) / width)
        width = limit
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error(`"${file.name}" konnte nicht konvertiert werden.`))
          }
        },
        targetFormat,
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`"${file.name}" konnte nicht als Bild gelesen werden.`))
    }
    img.src = url
  })
}

export default function ImageBatchConverter({ files }) {
  const [targetFormat, setTargetFormat] = useState('image/webp')
  const [quality, setQuality] = useState(0.85)
  const [maxWidth, setMaxWidth] = useState('')
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  const selected = FORMATS.find((f) => f.value === targetFormat)

  const handleRun = async () => {
    setStatus('running')
    setErrorMsg('')
    setProgress(0)
    try {
      const zip = new JSZip()
      const usedNames = new Set()

      for (let i = 0; i < files.length; i++) {
        const blob = await convertOne(files[i], targetFormat, selected?.lossy ? quality : undefined, maxWidth)
        let name = `${stripExtension(files[i].name)}.${selected.ext}`
        let n = 2
        while (usedNames.has(name)) {
          name = `${stripExtension(files[i].name)}-${n}.${selected.ext}`
          n += 1
        }
        usedNames.add(name)
        zip.file(name, blob)
        setProgress((i + 1) / files.length)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const zipName = `filetool-bilder-${selected.ext}.zip`
      setResult({ url, blob: zipBlob, name: zipName })
      setStatus('done')
      addHistoryEntry({ module: 'Bilder', detail: `Stapel → ${selected.label} (${files.length}×)`, fileName: zipName })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Stapelverarbeitung fehlgeschlagen.')
    }
  }

  return (
    <div className="converter">
      <p className="converter__hint">
        Alle {files.length} Bilder werden mit denselben Einstellungen umgewandelt und als ZIP gebündelt.
      </p>

      <div className="converter__row">
        <label className="converter__field">
          <span>Zielformat</span>
          <select value={targetFormat} onChange={(e) => { setTargetFormat(e.target.value); setStatus('idle') }}>
            {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label className="converter__field">
          <span>Max. Breite (px, optional)</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Original"
            value={maxWidth}
            onChange={(e) => { setMaxWidth(e.target.value); setStatus('idle') }}
          />
        </label>
      </div>

      {selected?.lossy && (
        <label className="converter__field converter__field--slider">
          <span>Qualität — {Math.round(quality * 100)}%</span>
          <input
            type="range" min="0.4" max="1" step="0.05"
            value={quality}
            onChange={(e) => { setQuality(Number(e.target.value)); setStatus('idle') }}
          />
        </label>
      )}

      <button className="converter__action" onClick={handleRun} disabled={status === 'running'}>
        {status === 'running' ? `Konvertiere… ${Math.round(progress * 100)}%` : `${files.length} Bilder konvertieren`}
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
