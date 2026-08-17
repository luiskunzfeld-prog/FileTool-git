import { useEffect, useRef, useState } from 'react'

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

export default function ImageConverter({ file }) {
  const [targetFormat, setTargetFormat] = useState('image/webp')
  const [quality, setQuality] = useState(0.85)
  const [maxWidth, setMaxWidth] = useState('')
  const [status, setStatus] = useState('idle') // idle | converting | done | error
  const [result, setResult] = useState(null) // { url, blob, width, height }
  const [errorMsg, setErrorMsg] = useState('')
  const objectUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const selected = FORMATS.find((f) => f.value === targetFormat)

  const handleConvert = () => {
    setStatus('converting')
    setErrorMsg('')

    const img = new Image()
    const sourceUrl = URL.createObjectURL(file)

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
      // JPG kennt keine Transparenz — weißer Hintergrund statt schwarz
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(sourceUrl)
          if (!blob) {
            setStatus('error')
            setErrorMsg('Konvertierung fehlgeschlagen.')
            return
          }
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
          const url = URL.createObjectURL(blob)
          objectUrlRef.current = url
          setResult({ url, blob, width, height })
          setStatus('done')
        },
        targetFormat,
        selected?.lossy ? quality : undefined,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      setStatus('error')
      setErrorMsg('Datei konnte nicht als Bild gelesen werden.')
    }

    img.src = sourceUrl
  }

  const downloadName = `${stripExtension(file.name)}.${selected?.ext ?? 'out'}`

  return (
    <div className="converter">
      <div className="converter__row">
        <label className="converter__field">
          <span>Zielformat</span>
          <select
            value={targetFormat}
            onChange={(e) => {
              setTargetFormat(e.target.value)
              setStatus('idle')
            }}
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>

        <label className="converter__field">
          <span>Max. Breite (px, optional)</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Original"
            value={maxWidth}
            onChange={(e) => {
              setMaxWidth(e.target.value)
              setStatus('idle')
            }}
          />
        </label>
      </div>

      {selected?.lossy && (
        <label className="converter__field converter__field--slider">
          <span>Qualität — {Math.round(quality * 100)}%</span>
          <input
            type="range"
            min="0.4"
            max="1"
            step="0.05"
            value={quality}
            onChange={(e) => {
              setQuality(Number(e.target.value))
              setStatus('idle')
            }}
          />
        </label>
      )}

      <button className="converter__action" onClick={handleConvert} disabled={status === 'converting'}>
        {status === 'converting' ? 'Konvertiere…' : 'Konvertieren'}
      </button>

      {status === 'error' && <p className="converter__error">{errorMsg}</p>}

      {status === 'done' && result && (
        <div className="converter__result">
          <div className="readout-row">
            <span className="readout-label">NEUE GRÖSSE</span>
            <span className="readout-value">
              {formatBytes(result.blob.size)} · {result.width}×{result.height}px
            </span>
          </div>
          <a className="converter__download" href={result.url} download={downloadName}>
            {downloadName} herunterladen
          </a>
        </div>
      )}
    </div>
  )
}
