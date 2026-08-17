import { useEffect, useState } from 'react'
import { getHistory, clearHistory, formatHistoryTime } from '../lib/history'

export default function HistoryPanel() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    setEntries(getHistory())
    // Andere Module in derselben Seite können jederzeit einen neuen Eintrag anlegen —
    // ein simples Event lässt dieses Panel dann neu laden, ohne globalen State-Manager.
    const onUpdate = () => setEntries(getHistory())
    window.addEventListener('filetool:history-updated', onUpdate)
    return () => window.removeEventListener('filetool:history-updated', onUpdate)
  }, [])

  if (entries.length === 0) return null

  const handleClear = () => {
    clearHistory()
    setEntries([])
  }

  return (
    <section className="workbench__history">
      <div className="history__top">
        <h2>Verlauf</h2>
        <button className="history__clear" onClick={handleClear}>Leeren</button>
      </div>
      <ul className="history__list">
        {entries.map((e, i) => (
          <li key={e.at + i} className="history__row">
            <span className="history__module">{e.module}</span>
            <span className="history__name">{e.fileName ?? e.detail}</span>
            {e.fileName && <span className="history__detail">{e.detail}</span>}
            <span className="history__time">{formatHistoryTime(e.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
