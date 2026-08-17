import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import TurndownService from 'turndown'

const FORMATS = [
  { value: 'md', label: 'Markdown', ext: 'md', mime: 'text/markdown' },
  { value: 'html', label: 'HTML', ext: 'html', mime: 'text/html' },
  { value: 'txt', label: 'Text', ext: 'txt', mime: 'text/plain' },
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

export default function DocxConverter({ file }) {
  const [targetFormat, setTargetFormat] = useState('md')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const selected = FORMATS.find((f) => f.value === targetFormat)

  const handleConvert = async () => {
    setStatus('converting')
    setErrorMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      let text
      let warnings = 0

      if (targetFormat === 'txt') {
        const { value, messages } = await mammoth.extractRawText({ arrayBuffer })
        text = value
        warnings = messages.length
      } else {
        const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer })
        warnings = messages.length
        text = targetFormat === 'html' ? html : new TurndownService().turndown(html)
      }

      const blob = new Blob([text], { type: selected.mime })
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setResult({ url, blob, warnings })
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'DOCX konnte nicht gelesen werden.')
    }
  }

  const downloadName = `${stripExtension(file.name)}.${selected.ext}`

  return (
    <div className="converter">
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

      <button className="converter__action" onClick={handleConvert} disabled={status === 'converting'}>
        {status === 'converting' ? 'Konvertiere…' : 'Konvertieren'}
      </button>

      {status === 'error' && <p className="converter__error">{errorMsg}</p>}

      {status === 'done' && result && (
        <div className="converter__result">
          <div className="readout-row">
            <span className="readout-label">GRÖSSE</span>
            <span className="readout-value">{formatBytes(result.blob.size)}</span>
          </div>
          {result.warnings > 0 && (
            <p className="converter__hint">
              {result.warnings} Formatierungshinweise beim Einlesen (komplexe Layouts wie Tabellen/Spalten werden vereinfacht übernommen).
            </p>
          )}
          <a className="converter__download" href={result.url} download={downloadName}>
            {downloadName} herunterladen
          </a>
        </div>
      )}
    </div>
  )
}
