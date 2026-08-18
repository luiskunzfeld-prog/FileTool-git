import { useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import { isVideoFile } from '../lib/fileCategory'
import { addHistoryEntry } from '../lib/history'

const CORE_VERSION = '0.12.10'
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`

const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4', mime: 'video/mp4' },
  { value: 'webm', label: 'WebM', mime: 'video/webm' },
]
const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3', mime: 'audio/mpeg' },
  { value: 'wav', label: 'WAV', mime: 'audio/wav' },
  { value: 'ogg', label: 'OGG', mime: 'audio/ogg' },
]

// Modul-weiter Singleton, damit der ~25 MB ffmpeg-Kern nur einmal pro Sitzung
// geladen wird, auch wenn mehrere Dateien nacheinander bearbeitet werden.
let sharedFFmpeg = null
let sharedLoadPromise = null
let currentProgressHandler = null

function getFFmpeg(onProgress) {
  currentProgressHandler = onProgress
  if (sharedFFmpeg) return Promise.resolve(sharedFFmpeg)
  if (!sharedLoadPromise) {
    sharedLoadPromise = (async () => {
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress }) => currentProgressHandler?.(Math.min(progress, 1)))
      const coreURL = await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
      await ffmpeg.load({ coreURL, wasmURL })
      sharedFFmpeg = ffmpeg
      return ffmpeg
    })()
  }
  return sharedLoadPromise
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stripExtension(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

function parseTimeToSeconds(input) {
  const parts = input.trim().split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) throw new Error(`Ungültige Zeit: "${input}" (Format: mm:ss oder Sekunden)`)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  throw new Error(`Ungültige Zeit: "${input}"`)
}

export default function AvConverter({ file }) {
  const isVideo = isVideoFile(file)
  const isLarge = file.size > 300 * 1024 * 1024 // 300 MB
  const [action, setAction] = useState('convert')
  const [targetFormat, setTargetFormat] = useState(isVideo ? 'mp4' : 'mp3')
  const [start, setStart] = useState('0:00')
  const [end, setEnd] = useState('0:30')
  const [coreStatus, setCoreStatus] = useState('idle') // idle | loading | ready
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const objectUrlRef = useRef(null)

  const formatOptions = action === 'extract-audio' ? AUDIO_FORMATS : (isVideo ? VIDEO_FORMATS : AUDIO_FORMATS)

  const handleRun = async () => {
    setStatus('running')
    setErrorMsg('')
    setProgress(0)
    try {
      if (coreStatus !== 'ready') setCoreStatus('loading')
      const ffmpeg = await getFFmpeg(setProgress)
      setCoreStatus('ready')

      const sourceExt = file.name.split('.').pop()
      const inputName = `input.${sourceExt}`
      await ffmpeg.writeFile(inputName, await fetchFile(file))

      let outputName
      let suffix

      if (action === 'trim') {
        const startSec = parseTimeToSeconds(start)
        const endSec = parseTimeToSeconds(end)
        if (endSec <= startSec) throw new Error('Ende muss nach dem Start liegen.')
        outputName = `output.${sourceExt}`
        suffix = 'trim'
        await ffmpeg.exec(['-i', inputName, '-ss', String(startSec), '-to', String(endSec), '-c', 'copy', outputName])
      } else if (action === 'extract-audio') {
        outputName = `output.${targetFormat}`
        suffix = 'audio'
        await ffmpeg.exec(['-i', inputName, '-vn', outputName])
      } else {
        outputName = `output.${targetFormat}`
        suffix = 'konvertiert'
        await ffmpeg.exec(['-i', inputName, outputName])
      }

      const data = await ffmpeg.readFile(outputName)
      const outExt = outputName.split('.').pop()
      const mime = [...VIDEO_FORMATS, ...AUDIO_FORMATS].find((f) => f.value === outExt)?.mime ?? 'application/octet-stream'
      const blob = new Blob([data.buffer], { type: mime })

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setResult({ url, blob, name: `${stripExtension(file.name)}-${suffix}.${outExt}` })
      setStatus('done')
      addHistoryEntry({ module: 'Audio · Video', detail: suffix, fileName: `${stripExtension(file.name)}-${suffix}.${outExt}` })

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Verarbeitung fehlgeschlagen.')
    }
  }

  return (
    <div className="converter">
      <label className="converter__field">
        <span>Aktion</span>
        <select
          value={action}
          onChange={(e) => {
            const next = e.target.value
            setAction(next)
            setTargetFormat(next === 'extract-audio' ? 'mp3' : (isVideo ? 'mp4' : 'mp3'))
            setStatus('idle')
          }}
        >
          <option value="convert">Format konvertieren</option>
          <option value="trim">Schneiden (Ausschnitt)</option>
          {isVideo && <option value="extract-audio">Ton extrahieren</option>}
        </select>
      </label>

      {action !== 'trim' && (
        <label className="converter__field">
          <span>Zielformat</span>
          <select
            value={targetFormat}
            onChange={(e) => {
              setTargetFormat(e.target.value)
              setStatus('idle')
            }}
          >
            {formatOptions.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
      )}

      {action === 'trim' && (
        <div className="converter__row">
          <label className="converter__field">
            <span>Start (mm:ss)</span>
            <input type="text" value={start} onChange={(e) => { setStart(e.target.value); setStatus('idle') }} />
          </label>
          <label className="converter__field">
            <span>Ende (mm:ss)</span>
            <input type="text" value={end} onChange={(e) => { setEnd(e.target.value); setStatus('idle') }} />
          </label>
        </div>
      )}

      {isLarge && (
        <p className="converter__hint converter__hint--warn">
          Große Datei ({formatBytes(file.size)}) — das kann einige Minuten dauern und bei sehr
          großen Videos am Speicherlimit des Browsers scheitern. Bei Problemen: kürzeren
          Ausschnitt zuerst schneiden, dann konvertieren.
        </p>
      )}

      <button className="converter__action" onClick={handleRun} disabled={status === 'running'}>
        {status === 'running'
          ? (coreStatus === 'loading' && progress === 0 ? 'Lade Modul (~25 MB, einmalig)…' : `Verarbeite… ${Math.round(progress * 100)}%`)
          : 'Ausführen'}
      </button>

      {status === 'running' && (
        <p className="converter__hint">
          {coreStatus === 'loading' && progress === 0
            ? 'Beim ersten Mal wird die Engine aus dem Netz geladen — danach schneller.'
            : 'Läuft komplett lokal im Browser, kann bei großen Dateien dauern.'}
        </p>
      )}

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
