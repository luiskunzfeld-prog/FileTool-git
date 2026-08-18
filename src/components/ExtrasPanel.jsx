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

  const ACTION_HINTS = {
    'base64-encode': 'Wandelt Text in eine Zeichenfolge aus Buchstaben/Zahlen um (z. B. für E-Mail-Anhänge oder Datenübertragung). "Hallo" → "SGFsbG8=". Kein Verschlüsseln — jeder kann es zurückwandeln.',
    'base64-decode': 'Wandelt eine Base64-kodierte Zeichenfolge zurück in lesbaren Text.',
    'url-encode': 'Ersetzt Sonderzeichen/Leerzeichen durch %-Codes, damit ein Text sicher in einer Web-Adresse stehen kann.',
    'url-decode': 'Macht URL-Kodierung wieder rückgängig.',
    sha256: 'Erzeugt eine eindeutige "Prüfsumme" aus dem Text — nützlich um zu prüfen, ob sich zwei Texte/Dateien unterscheiden. Lässt sich nicht zurückrechnen.',
  }

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
      <p className="converter__hint">{ACTION_HINTS[action]}</p>
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

const UNIT_CATEGORIES = {
  laenge: {
    label: 'Länge',
    units: {
      mm: 0.001, cm: 0.01, m: 1, km: 1000,
      zoll: 0.0254, fuß: 0.3048, yard: 0.9144, meile: 1609.344,
    },
  },
  gewicht: {
    label: 'Gewicht',
    units: { mg: 0.000001, g: 0.001, kg: 1, tonne: 1000, unze: 0.0283495, pfund: 0.453592 },
  },
  volumen: {
    label: 'Volumen',
    units: { ml: 0.001, l: 1, 'US-Gallone': 3.78541, 'US-Pint': 0.473176 },
  },
}

function celsiusTo(unit, c) {
  if (unit === 'celsius') return c
  if (unit === 'fahrenheit') return c * (9 / 5) + 32
  return c + 273.15
}

function toCelsius(unit, v) {
  if (unit === 'celsius') return v
  if (unit === 'fahrenheit') return (v - 32) * (5 / 9)
  return v - 273.15
}

function UnitConverter() {
  const [category, setCategory] = useState('laenge')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('cm')
  const [value, setValue] = useState('1')

  const isTemp = category === 'temperatur'
  const units = isTemp ? ['celsius', 'fahrenheit', 'kelvin'] : Object.keys(UNIT_CATEGORIES[category].units)
  const unitLabel = { celsius: '°C', fahrenheit: '°F', kelvin: 'K' }

  const handleCategoryChange = (next) => {
    setCategory(next)
    const firstUnits = next === 'temperatur' ? ['celsius', 'fahrenheit', 'kelvin'] : Object.keys(UNIT_CATEGORIES[next].units)
    setFromUnit(firstUnits[0])
    setToUnit(firstUnits[1])
  }

  const numeric = Number(value.replace(',', '.'))
  let result = null
  if (!Number.isNaN(numeric)) {
    if (isTemp) {
      result = celsiusTo(toUnit, toCelsius(fromUnit, numeric))
    } else {
      const u = UNIT_CATEGORIES[category].units
      result = (numeric * u[fromUnit]) / u[toUnit]
    }
  }

  return (
    <div className="converter">
      <label className="converter__field">
        <span>Kategorie</span>
        <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
          {Object.entries(UNIT_CATEGORIES).map(([key, c]) => (
            <option key={key} value={key}>{c.label}</option>
          ))}
          <option value="temperatur">Temperatur</option>
        </select>
      </label>

      <div className="converter__row">
        <label className="converter__field">
          <span>Von</span>
          <input type="text" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="converter__field">
          <span>Einheit</span>
          <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{isTemp ? unitLabel[u] : u}</option>)}
          </select>
        </label>
      </div>

      <label className="converter__field">
        <span>Ziel-Einheit</span>
        <select value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
          {units.map((u) => <option key={u} value={u}>{isTemp ? unitLabel[u] : u}</option>)}
        </select>
      </label>

      {result !== null && (
        <div className="converter__result">
          <div className="readout-row">
            <span className="readout-label">ERGEBNIS</span>
            <span className="readout-value">
              {result.toLocaleString('de-DE', { maximumFractionDigits: 6 })} {isTemp ? unitLabel[toUnit] : toUnit}
            </span>
          </div>
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
        <button
          role="tab"
          aria-selected={tab === 'units'}
          className={`extras-panel__tab${tab === 'units' ? ' extras-panel__tab--active' : ''}`}
          onClick={() => setTab('units')}
        >
          Umrechner
        </button>
      </div>
      {tab === 'qr' && <QrTool />}
      {tab === 'encode' && <EncodingTool />}
      {tab === 'units' && <UnitConverter />}
    </div>
  )
}
