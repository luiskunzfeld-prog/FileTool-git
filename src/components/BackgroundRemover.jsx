import { useEffect, useRef, useState } from 'react'
import { addHistoryEntry } from '../lib/history'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stripExtension(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
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

  const handleRun = () => {
    setStatus('running')
    setErrorMsg('')
    setProgress(0)

    const worker = getWorker()
    const id = Date.now()

    const onMessage = (e) => {
      if (e.data.id !== id) return
      if (e.data.type === 'progress') {
        const p = e.data.info?.progress
        if (typeof p === 'number') setProgress(Math.min(p / 100, 1))
      } else if (e.data.type === 'done') {
        worker.removeEventListener('message', onMessage)
        const blob = e.data.blob
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        const name = `${stripExtension(file.name)}-freigestellt.png`
        setResult({ url, blob, name })
        setStatus('done')
        addHistoryEntry({ module: 'Bilder', detail: 'Hintergrund entfernt', fileName: name })
      } else if (e.data.type === 'error') {
        worker.removeEventListener('message', onMessage)
        setStatus('error')
        setErrorMsg(e.data.message)
      }
    }

    worker.addEventListener('message', onMessage)
    worker.postMessage({ id, blob: file })
  }

  return (
    <>
      <p className="converter__hint converter__hint--warn">
        Lädt beim ersten Mal ein KI-Modell nach (mehrere hundert MB, einmalig, danach gecacht).
        Funktioniert am besten bei Fotos mit klar erkennbaren Personen/Objekten — bei komplexen
        Szenen ist das Ergebnis nicht immer perfekt. Läuft in einem eigenen Hintergrund-Thread,
        friert die App währenddessen nicht ein.
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
