const KEY = 'filetool:history'
const MAX_ENTRIES = 12

export function addHistoryEntry({ module, detail, fileName }) {
  const entries = getHistory()
  entries.unshift({ module, detail, fileName, at: Date.now() })
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // localStorage kann in seltenen Fällen (Private Mode, Quota) fehlschlagen — dann einfach ignorieren
  }
  window.dispatchEvent(new Event('filetool:history-updated'))
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorieren
  }
}

export function formatHistoryTime(timestamp) {
  const diffMs = Date.now() - timestamp
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} Std.`
  return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}
