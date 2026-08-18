import { useEffect, useRef, useState } from 'react'
import { addHistoryEntry } from '../lib/history'

const MAX_DIMENSION = 1600 // größere Fotos vorher verkleinern, sonst überlastet das WASM-Modell den Speicher

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stripExtension(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

// Verkleinert sehr große Fotos (z. B. 12-MP-Handybilder) vor der KI-Verarbeitung,
// damit das WASM-Modell nicht am Speicher scheitert. Kleine Bilder bleiben unverändert.
function downscaleIfNeeded(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const { width, height } = img
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        URL.revokeObjectURL(url)
        resolve(file)
        return
      }
      const scale = MAX_DIMENSION / Math.max(width, height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Bild konnte nicht verkleinert werden.'))
        }
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Datei konnte nicht als Bild gelesen werden.'))
    }
    img.src = url
  })
}

// Modul-weiter Worker-Singleton — das KI-Modell wird nur einmal pro Sitzung geladen.
let sharedWorker = null
function getWorker() {
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('../workers/bgRemoveWorker.js', import.meta.url), { type: 'module' })
  }
  return sharedWorker
}

export default function BackgroundRemover({ file }) {
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleRun = async () => {
    setStatus('running')
    setErrorMsg('')
    setProgress(0)

    const worker = getWorker()
    const id = Date.now()

    const cleanup = () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onWorkerError)
      worker.removeEventListener('messageerror', onWorkerError)
    }

    const onMessage = (e) => {
      if (e.data.id !== id) return
      if (e.data.type === 'progress') {
        const p = e.data.info?.progress
        if (typeof p === 'number') setProgress(Math.min(p / 100, 1))
      } else if (e.data.type === 'done') {
        cleanup()
        const blob = e.data.blob
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        const name = `${stripExtension(file.name)}-freigestellt.png`
        setResult({ url, blob, name })
        setStatus('done')
        addHistoryEntry({ module: 'Bilder', detail: 'Hintergrund entfernt', fileName: name })
      } else if (e.data.type === 'error') {
        cleanup()
        setStatus('error')
        setErrorMsg(e.data.message)
      }
    }

    // Fängt einen kompletten Absturz des Worker-Threads ab (z. B. durch Speicherüberlastung
    // bei sehr großen Bildern) — sonst bleibt die Seite ohne jede Meldung hängen.
    const onWorkerError = () => {
      cleanup()
      setStatus('error')
      setErrorMsg(
        'Die Verarbeitung ist abgestürzt — meist wegen zu wenig Speicher. Versuch es mit einem kleineren Bild oder lade die Seite neu.',
      )
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onWorkerError)
    worker.addEventListener('messageerror', onWorkerError)

    try {
      const input = await downscaleIfNeeded(file)
      worker.postMessage({ id, blob: input })
    } catch (err) {
      cleanup()
      setStatus('error')
      setErrorMsg(err.message || 'Bild konnte nicht vorbereitet werden.')
    }
  }

  return (
    <>
      <p className="converter__hint converter__hint--warn">
        Lädt beim ersten Mal ein KI-Modell nach (mehrere hundert MB, einmalig, danach gecacht).
        Funktioniert am besten bei Fotos mit klar erkennbaren Personen/Objekten — bei komplexen
        Szenen ist das Ergebnis nicht immer perfekt. Große Fotos werden vorher automatisch
        verkleinert, damit die Verarbeitung nicht am Speicher scheitert. Läuft in einem eigenen
        Hintergrund-Thread, friert die App währenddessen nicht ein.
      </p>

      <button className="converter__action" onClick={handleRun} disabled={status === 'running'}>
        {status === 'running' ? `Verarbeite… ${Math.round(progress * 100)}%` : 'Hintergrund entfernen'}
      </button>

      {status === 'error' && <p className="converter__error">{errorMsg}</p>}

      {status === 'done' && result && (
        <div className="converter__result">
          <div className="image-preview-row">
            <div className="image-preview">
              <img src={result.url} alt="Ergebnis ohne Hintergrund" />
              <span className="image-preview__label">Ergebnis</span>
            </div>
          </div>
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
