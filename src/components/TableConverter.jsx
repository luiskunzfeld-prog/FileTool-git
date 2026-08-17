import { useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { getExtension } from '../lib/fileCategory'

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'json', label: 'JSON' },
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

async function parseSource(file, sourceExt) {
  if (sourceExt === 'csv') {
    const text = await file.text()
    const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (errors.length) throw new Error('CSV konnte nicht vollständig gelesen werden.')
    return data
  }
  if (sourceExt === 'xlsx' || sourceExt === 'xls') {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const firstSheet = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
  }
  if (sourceExt === 'json') {
    const text = await file.text()
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  }
  throw new Error('Unbekanntes Quellformat.')
}

function buildOutput(rows, target) {
  if (target === 'csv') {
    return { blob: new Blob([Papa.unparse(rows)], { type: 'text/csv' }), ext: 'csv' }
  }
  if (target === 'json') {
    return { blob: new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), ext: 'json' }
  }
  if (target === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return { blob: new Blob([out], { type: 'application/octet-stream' }), ext: 'xlsx' }
  }
  throw new Error('Unbekanntes Zielformat.')
}

export default function TableConverter({ file }) {
  const sourceExt = getExtension(file) === 'xls' ? 'xls' : getExtension(file)
  const [targetFormat, setTargetFormat] = useState(sourceExt === 'csv' ? 'xlsx' : 'csv')
  const [status, setStatus] = useState('idle') // idle | converting | done | error
  const [result, setResult] = useState(null) // { url, blob, rows, cols }
  const [errorMsg, setErrorMsg] = useState('')
  const objectUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleConvert = async () => {
    setStatus('converting')
    setErrorMsg('')
    try {
      const rows = await parseSource(file, sourceExt)
      if (!rows.length) throw new Error('Keine Zeilen gefunden.')

      const { blob, ext } = buildOutput(rows, targetFormat)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const cols = Object.keys(rows[0] ?? {}).length
      setResult({ url, blob, ext, rowCount: rows.length, colCount: cols })
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Konvertierung fehlgeschlagen.')
    }
  }

  const downloadName = `${stripExtension(file.name)}.${result?.ext ?? targetFormat}`
  const targetOptions = FORMATS.filter((f) => f.value !== sourceExt)

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
          {targetOptions.map((f) => (
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
            <span className="readout-label">ERKANNT</span>
            <span className="readout-value">{result.rowCount} Zeilen · {result.colCount} Spalten</span>
          </div>
          <div className="readout-row">
            <span className="readout-label">GRÖSSE</span>
            <span className="readout-value">{formatBytes(result.blob.size)}</span>
          </div>
          <a className="converter__download" href={result.url} download={downloadName}>
            {downloadName} herunterladen
          </a>
        </div>
      )}
    </div>
  )
}
