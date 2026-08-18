import { describe, it, expect, beforeEach } from 'vitest'
import { addHistoryEntry, getHistory, clearHistory, formatHistoryTime } from './history'

beforeEach(() => {
  localStorage.clear()
})

describe('history', () => {
  it('startet leer', () => {
    expect(getHistory()).toEqual([])
  })

  it('fügt Einträge am Anfang hinzu (neueste zuerst)', () => {
    addHistoryEntry({ module: 'Bilder', detail: 'a', fileName: 'a.png' })
    addHistoryEntry({ module: 'Tabellen', detail: 'b', fileName: 'b.csv' })
    const entries = getHistory()
    expect(entries).toHaveLength(2)
    expect(entries[0].fileName).toBe('b.csv')
    expect(entries[1].fileName).toBe('a.png')
  })

  it('begrenzt die Anzahl der gespeicherten Einträge', () => {
    for (let i = 0; i < 20; i++) {
      addHistoryEntry({ module: 'Test', detail: `#${i}`, fileName: `f${i}.txt` })
    }
    expect(getHistory().length).toBeLessThanOrEqual(12)
  })

  it('leert den Verlauf', () => {
    addHistoryEntry({ module: 'Bilder', detail: 'a', fileName: 'a.png' })
    clearHistory()
    expect(getHistory()).toEqual([])
  })
})

describe('formatHistoryTime', () => {
  it('zeigt "gerade eben" für sehr aktuelle Zeitpunkte', () => {
    expect(formatHistoryTime(Date.now())).toBe('gerade eben')
  })
  it('zeigt Minuten für Zeitpunkte innerhalb der letzten Stunde', () => {
    expect(formatHistoryTime(Date.now() - 5 * 60000)).toMatch(/Min\./)
  })
})
