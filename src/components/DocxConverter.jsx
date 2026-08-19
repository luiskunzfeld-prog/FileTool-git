import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
import { getExtension } from '../lib/fileCategory'
import { addHistoryEntry } from '../lib/history'

const READ_FORMATS = [
  { value: 'md', label: 'Markdown', ext: 'md', mime: 'text/markdown' },
  { value: 'html', label: 'HTML', ext: 'html', mime: 'text/html' },
  { value: 'txt', label: 'Text', ext: 'txt', mime: 'text/plain' },
  { value: 'xlsx', label: 'Excel (XLSX)', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
]

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
]

const HEADING_LABELS = {
  H1: 'Überschrift 1', H2: 'Überschrift 2', H3: 'Überschrift 3',
  H4: 'Überschrift 4', H5: 'Überschrift 5', H6: 'Überschrift 6',
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

function lineToParagraph(line, isMarkdown) {
  if (isMarkdown) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      return new Paragraph({ text: heading[2], heading: HEADING_LEVELS[heading[1].length - 1] })
    }
  }
  return new Paragraph({ text: line })
}

async function buildDocxFromText(text, isMarkdown) {
  const paragraphs = text.split(/\r?\n/).map((line) => lineToParagraph(line, isMarkdown))
  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBlob(doc)
}

// Wandelt das komplette DOCX (nicht nur enthaltene Tabellen) in eine XLSX-Arbeitsmappe um.
// Blatt "Inhalt": jede Zeile = ein Element aus dem Word-Dokument (Überschrift/Absatz/Liste), in Lesereihenfolge.
// Jede im Dokument enthaltene Tabelle bekommt zusätzlich ein eigenes Blatt mit den Original-Zellen.
function buildXlsxFromHtml(html) {
  const dom = new DOMParser().parseFromString(html, 'text/html')
  const rows = [['Typ', 'Inhalt']]
  const tables = []

  for (const node of dom.body.children) {
    const tag = node.tagName
    const text = node.textContent.trim()

    if (tag === 'TABLE') {
      const tableRows = [...node.querySelectorAll('tr')].map((tr) =>
        [...tr.children].map((cell) => cell.textContent.trim())
      )
      tables.push(tableRows)
      rows.push(['Tabelle', `siehe Blatt "Tabelle ${tables.length}"`])
    } else if (HEADING_LABELS[tag]) {
      if (text) rows.push([HEADING_LABELS[tag], text])
    } else if (tag === 'UL' || tag === 'OL') {
      for (const li of node.children) {
        const liText = li.textContent.trim()
        if (liText) rows.push(['Liste', liText])
      }
    } else if (tag === 'P') {
      if (text) rows.push(['Absatz', text])
    } else if (text) {
      rows.push([tag.toLowerCase(), text])
    }
  }

  const workbook = XLSX.utils.book_new()
  const mainSheet = XLSX.utils.aoa_to_sheet(rows)
  mainSheet['!cols'] = [{ wch: 16 }, { wch: 100 }]
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Inhalt')

  tables.forEach((tableRows, i) => {
    const sheet = XLSX.utils.aoa_to_sheet(tableRows)
    XLSX.utils.book_append_sheet(workbook, sheet, `Tabelle ${i + 1}`)
  })

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Liest ein bestehendes DOCX aus und wandelt es in Markdown/HTML/Text/XLSX um.
function DocxToText({ file }) {
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

  const selected = READ_FORMATS.find((f) => f.value === targetFormat)

  const handleConvert = async () => {
    setStatus('converting')
    setErrorMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      let blob
      let warnings = 0

      if (targetFormat === 'txt') {
        const { value, messages } = await mammoth.extractRawText({ arrayBuffer })
        warnings = messages.length
        blob = new Blob([value], { type: selected.mime })
      } else if (targetFormat === 'xlsx') {
        const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer })
        warnings = messages.length
        blob = buildXlsxFromHtml(html)
      } else {
        const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer })
        warnings = messages.length
        const text = targetFormat === 'html' ? html : new TurndownService().turndown(html)
        blob = new Blob([text], { type: selected.mime })
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setResult({ url, blob, warnings })
      setStatus('done')
      addHistoryEntry({ module: 'Dokumente', detail: `→ ${selected.label}`, fileName: `${stripExtension(file.name)}.${selected.ext}` })
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
        <select value={targetFormat} onChange={(e) => { setTargetFormat(e.target.value); setStatus('idle') }}>
          {READ_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
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

// Baut aus Markdown oder reinem Text ein neues DOCX (Überschriften bei Markdown erkannt,
// weitergehende Formatierung wie Fett/Kursiv/Listen wird bewusst nicht nachgebildet).
function TextToDocx({ file, sourceExt }) {
  const isMarkdown = sourceExt === 'md' || sourceExt === 'markdown'
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)
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
      const text = await file.text()
      const blob = await buildDocxFromText(text, isMarkdown)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const name = `${stripExtension(file.name)}.docx`
      setResult({ url, blob, name })
      setStatus('done')
      addHistoryEntry({ module: 'Dokumente', detail: '→ DOCX', fileName: name })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'DOCX konnte nicht erzeugt werden.')
    }
  }

  return (
    <div className="converter">
      <p className="converter__hint">
        {isMarkdown
          ? 'Überschriften (#, ##, ###) werden als Word-Überschriften übernommen. Fett/Kursiv/Listen und andere Formatierung werden aktuell nicht nachgebildet.'
          : 'Jede Zeile wird ein Absatz im neuen Word-Dokument.'}
      </p>
      <button className="converter__action" onClick={handleConvert} disabled={status === 'converting'}>
        {status === 'converting' ? 'Erzeuge DOCX…' : 'In DOCX umwandeln'}
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

export default function DocxConverter({ file }) {
  const sourceExt = getExtension(file)
  return sourceExt === 'docx'
    ? <DocxToText file={file} />
    : <TextToDocx file={file} sourceExt={sourceExt} />
}
