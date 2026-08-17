import { useState } from 'react'
import QRCode from 'qrcode'
import { addHistoryEntry } from '../lib/history'

const ENCODE_ACTIONS = [
  { value: 'base64-encode', label: 'Base64 kodieren' },
  { value: 'base64-decode', label: 'Base64 dekodieren' },
  { value: 'url-encode', label: 'URL kodieren' },
  { value: 'url-decode', label: 'URL dekodieren' },
  { value: 'sha256', label: 'SHA-256 Hash' },
]

function toBase64Utf8(text) {
  return btoa(unescape(encodeURIComponent(text)))
}

function fromBase64Utf8(text) {
  return decodeURIComponent(escape(atob(text)))
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function QrTool() {
  const [text, setText] = useState('')
  const [dataUrl, setDataUrl] = useState(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setError('')
    if (!text.trim()) {
      setError('Bitte Text oder URL eingeben.')
      setDataUrl(null)
      return
    }
    try {
      const url = await QRCode.toDataURL(text, { width: 320, margin: 1 })
      setDataUrl(url)
      addHistoryEntry({ module: 'Extras', detail: 'QR-Code erzeugt', fileName: 'qrcode.png' })
    } catch {
      setError('QR-Code konnte nicht erzeugt werden — Text evtl. zu lang.')
      setDataUrl(null)
    }
  }

  return (
    <div className="converter">
      <label className="converter__field">
        <span>Text oder URL</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com"
        />
      </label>
      <button className="converter__action" onClick={handleGenerate}>QR-Code erzeugen</button>
      {error && <p className="converter__error">{error}</p>}
      {dataUrl && (
        <div className="converter__result">
          <img src={dataUrl} alt="Generierter QR-Code" className="qr-preview" />
          <a className="converter__download" href={dataUrl} download="qrcode.png">
            qrcode.png herunterladen
          </a>
        </div>
      )}
    </div>
  )
}

function EncodingTool() {
  const [action, setAction] = useState('base64-encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleRun = async () => {
    setError('')
    setCopied(false)
    try {
      switch (action) {
        case 'base64-encode': setOutput(toBase64Utf8(input)); break
        case 'base64-decode': setOutput(fromBase64Utf8(input)); break
        case 'url-encode': setOutput(encodeURIComponent(input)); break
        case 'url-decode': setOutput(decodeURIComponent(input)); break
        case 'sha256': setOutput(await sha256Hex(input)); break
        default: break
      }
      addHistoryEntry({
        module: 'Extras',
        detail: ENCODE_ACTIONS.find((a) => a.value === action)?.label,
        fileName: null,
      })
    } catch {
      setError('Eingabe konnte nicht verarbeitet werden (ungültiges Format für diese Aktion).')
      setOutput('')
    }
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="converter">
      <label className="converter__field">
        <span>Aktion</span>
        <select value={action} onChange={(e) => { setAction(e.target.value); setOutput(''); setError('') }}>
          {ENCODE_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </label>
      <label className="converter__field">
        <span>Eingabe</span>
        <textarea
          className="converter__textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
        />
      </label>
      <button className="converter__action" onClick={handleRun}>Ausführen</button>
      {error && <p className="converter__error">{error}</p>}
      {output && (
        <div className="converter__result">
          <textarea className="converter__textarea" value={output} readOnly rows={3} />
          <button className="readout-reset" onClick={handleCopy}>
            {copied ? 'Kopiert ✓' : 'In Zwischenablage kopieren'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ExtrasPanel() {
  const [tab, setTab] = useState('qr')

  return (
    <div className="extras-panel">
      <div className="extras-panel__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'qr'}
          className={`extras-panel__tab${tab === 'qr' ? ' extras-panel__tab--active' : ''}`}
          onClick={() => setTab('qr')}
        >
          QR-Code
        </button>
        <button
          role="tab"
          aria-selected={tab === 'encode'}
          className={`extras-panel__tab${tab === 'encode' ? ' extras-panel__tab--active' : ''}`}
          onClick={() => setTab('encode')}
        >
          Encoding
        </button>
      </div>
      {tab === 'qr' ? <QrTool /> : <EncodingTool />}
    </div>
  )
}
