import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { addHistoryEntry } from '../lib/history'
import { getPresets, savePreset, deletePreset } from '../lib/presets'

const ImageToPdf = lazy(() => import('./ImageToPdf'))
const BackgroundRemover = lazy(() => import('./BackgroundRemover'))

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

function FormatConvert({ file }) {
  const [targetFormat, setTargetFormat] = useState('image/webp')
  const [quality, setQuality] = useState(0.85)
  const [maxWidth, setMaxWidth] = useState('')
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState({ top: '0', bottom: '0', left: '0', right: '0' })
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const objectUrlRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const [presets, setPresets] = useState(() => getPresets())
  const [selectedPreset, setSelectedPreset] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [presetName, setPresetName] = useState('')

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const selected = FORMATS.find((f) => f.value === targetFormat)

  const applyPreset = (name) => {
    const preset = presets.find((p) => p.name === name)
    if (!preset) return
    setTargetFormat(preset.targetFormat)
    setQuality(preset.quality)
    setMaxWidth(preset.maxWidth)
    setRotation(preset.rotation ?? 0)
    setCrop(preset.crop ?? { top: '0', bottom: '0', left: '0', right: '0' })
    setSelectedPreset(name)
    setStatus('idle')
  }

  const handleSavePreset = () => {
    const name = presetName.trim()
    if (!name) return
    setPresets(savePreset(name, { targetFormat, quality, maxWidth, rotation, crop }))
    setSelectedPreset(name)
    setPresetName('')
    setShowSaveInput(false)
  }

  const handleDeletePreset = () => {
    if (!selectedPreset) return
    setPresets(deletePreset(selectedPreset))
    setSelectedPreset('')
  }

  const handleConvert = () => {
    setStatus('converting')
    setErrorMsg('')

    const img = new Image()
    const sourceUrl = URL.createObjectURL(file)

    img.onload = () => {
      const natW = img.naturalWidth
      const natH = img.naturalHeight

      const cropLeft = Math.min(Number(crop.left) || 0, 45)
      const cropRight = Math.min(Number(crop.right) || 0, 45)
      const cropTop = Math.min(Number(crop.top) || 0, 45)
      const cropBottom = Math.min(Number(crop.bottom) || 0, 45)

      const sx = natW * (cropLeft / 100)
      const sy = natH * (cropTop / 100)
      const sWidth = natW * (1 - cropLeft / 100 - cropRight / 100)
      const sHeight = natH * (1 - cropTop / 100 - cropBottom / 100)

      let targetWidth = sWidth
      let targetHeight = sHeight
      const limit = Number(maxWidth)
      if (limit > 0 && targetWidth > limit) {
        targetHeight = Math.round((targetHeight * limit) / targetWidth)
        targetWidth = limit
      }

      const rotated = rotation === 90 || rotation === 270
      const canvas = document.createElement('canvas')
      canvas.width = rotated ? targetHeight : targetWidth
      canvas.height = rotated ? targetWidth : targetHeight
      const ctx = canvas.getContext('2d')

      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, sx, sy, sWidth, sHeight, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight)
      ctx.restore()

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
          setResult({ url, blob, width: canvas.width, height: canvas.height })
          setStatus('done')
          addHistoryEntry({ module: 'Bilder', detail: `→ ${selected?.label}`, fileName: downloadName })
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
    <>
      <div className="image-preview-row">
        {previewUrl && (
          <div className="image-preview">
            <img src={previewUrl} alt="Vorschau der Originaldatei" />
            <span className="image-preview__label">Original</span>
          </div>
        )}
        {status === 'done' && result && (
          <div className="image-preview">
            <img src={result.url} alt="Vorschau des Ergebnisses" />
            <span className="image-preview__label">Ergebnis</span>
          </div>
        )}
      </div>

      <div className="converter__presets">
        <select
          className="converter__preset-select"
          value={selectedPreset}
          onChange={(e) => (e.target.value ? applyPreset(e.target.value) : setSelectedPreset(''))}
        >
          <option value="">Preset laden…</option>
          {presets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        {selectedPreset && (
          <button type="button" className="converter__preset-link" onClick={handleDeletePreset}>löschen</button>
        )}
        {showSaveInput ? (
          <>
            <input
              type="text"
              className="converter__preset-input"
              placeholder="Preset-Name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <button type="button" className="converter__preset-link" onClick={handleSavePreset}>speichern</button>
          </>
        ) : (
          <button type="button" className="converter__preset-link" onClick={() => setShowSaveInput(true)}>
            als Preset speichern
          </button>
        )}
      </div>

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

      <label className="converter__field">
        <span>Rotation</span>
        <select value={rotation} onChange={(e) => { setRotation(Number(e.target.value)); setStatus('idle') }}>
          <option value={0}>Keine</option>
          <option value={90}>90°</option>
          <option value={180}>180°</option>
          <option value={270}>270°</option>
        </select>
      </label>

      <div className="converter__field">
        <span>Zuschnitt (% von jeder Seite abschneiden)</span>
        <div className="crop-grid">
          <label className="crop-grid__field">
            <span>Oben</span>
            <input type="number" min="0" max="45" value={crop.top} onChange={(e) => { setCrop((c) => ({ ...c, top: e.target.value })); setStatus('idle') }} />
          </label>
          <label className="crop-grid__field">
            <span>Unten</span>
            <input type="number" min="0" max="45" value={crop.bottom} onChange={(e) => { setCrop((c) => ({ ...c, bottom: e.target.value })); setStatus('idle') }} />
          </label>
          <label className="crop-grid__field">
            <span>Links</span>
            <input type="number" min="0" max="45" value={crop.left} onChange={(e) => { setCrop((c) => ({ ...c, left: e.target.value })); setStatus('idle') }} />
          </label>
          <label className="crop-grid__field">
            <span>Rechts</span>
            <input type="number" min="0" max="45" value={crop.right} onChange={(e) => { setCrop((c) => ({ ...c, right: e.target.value })); setStatus('idle') }} />
          </label>
        </div>
      </div>

      <button className="converter__action" onClick={handleConvert} disabled={status === 'converting'}>
        {status === 'converting' ? 'Konvertiere…' : 'Konvertieren'}
      </button>

      {status === 'error' && <p className="converter__error">{errorMsg}</p>}

      {status === 'done' && result && (
        <div className="converter__result">
          <div className="readout-row">
            <span className="readout-label">NEUE GRÖSSE</span>
            <span className="readout-value">{formatBytes(result.blob.size)} · {result.width}×{result.height}px</span>
          </div>
          <a className="converter__download" href={result.url} download={downloadName}>
            {downloadName} herunterladen
          </a>
        </div>
      )}
    </>
  )
}

export default function ImageConverter({ file }) {
  const [action, setAction] = useState('convert')

  return (
    <div className="converter">
      <label className="converter__field">
        <span>Aktion</span>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="convert">Format konvertieren</option>
          <option value="to-pdf">In PDF umwandeln</option>
          <option value="remove-bg">Hintergrund entfernen</option>
        </select>
      </label>

      {action === 'convert' && <FormatConvert file={file} />}
      {action === 'to-pdf' && (
        <Suspense fallback={<p className="readout-status">Lade PDF-Modul…</p>}>
          <ImageToPdf file={file} />
        </Suspense>
      )}
      {action === 'remove-bg' && (
        <Suspense fallback={<p className="readout-status">Lade KI-Modul…</p>}>
          <BackgroundRemover file={file} />
        </Suspense>
      )}
    </div>
  )
}
