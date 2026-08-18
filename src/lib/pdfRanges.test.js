import { describe, it, expect } from 'vitest'
import { rangesToIndices } from './pdfRanges'

describe('rangesToIndices', () => {
  it('wandelt eine einzelne Seite in einen 0-basierten Index um', () => {
    expect(rangesToIndices([{ from: '3', to: '' }], 10)).toEqual([2])
  })
  it('wandelt einen Bereich in mehrere Indizes um', () => {
    expect(rangesToIndices([{ from: '1', to: '3' }], 10)).toEqual([0, 1, 2])
  })
  it('kombiniert mehrere Bereiche und entfernt Duplikate', () => {
    expect(rangesToIndices([{ from: '1', to: '2' }, { from: '2', to: '3' }], 10)).toEqual([0, 1, 2])
  })
  it('vertauscht Von/Bis automatisch, falls falsch herum eingegeben', () => {
    expect(rangesToIndices([{ from: '5', to: '3' }], 10)).toEqual([2, 3, 4])
  })
  it('ignoriert leere Zeilen', () => {
    expect(rangesToIndices([{ from: '2', to: '' }, { from: '', to: '' }], 10)).toEqual([1])
  })
  it('wirft einen Fehler, wenn gar nichts ausgefüllt ist', () => {
    expect(() => rangesToIndices([{ from: '', to: '' }], 10)).toThrow()
  })
  it('wirft einen Fehler bei Seitenzahlen außerhalb des Dokuments', () => {
    expect(() => rangesToIndices([{ from: '99', to: '' }], 10)).toThrow()
  })
})
