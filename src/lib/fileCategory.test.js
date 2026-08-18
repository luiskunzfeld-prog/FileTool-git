import { describe, it, expect } from 'vitest'
import { categorize, getExtension, isVideoFile } from './fileCategory'

function makeFile(name, type = '') {
  return new File(['x'], name, { type })
}

describe('getExtension', () => {
  it('liest die Dateiendung in Kleinbuchstaben', () => {
    expect(getExtension(makeFile('Foto.JPG'))).toBe('jpg')
  })
  it('liefert leeren String ohne Endung', () => {
    expect(getExtension(makeFile('README'))).toBe('')
  })
})

describe('categorize', () => {
  it('erkennt Bilder', () => {
    expect(categorize(makeFile('a.png', 'image/png'))).toBe('image')
    expect(categorize(makeFile('a.webp', 'image/webp'))).toBe('image')
  })
  it('lehnt HEIC/SVG als Bild ab (bewusst nicht unterstützt)', () => {
    expect(categorize(makeFile('a.heic', 'image/heic'))).toBe('unknown')
    expect(categorize(makeFile('a.svg', 'image/svg+xml'))).toBe('unknown')
  })
  it('erkennt Tabellen', () => {
    expect(categorize(makeFile('a.csv'))).toBe('table')
    expect(categorize(makeFile('a.xlsx'))).toBe('table')
    expect(categorize(makeFile('a.json'))).toBe('table')
  })
  it('erkennt PDF', () => {
    expect(categorize(makeFile('a.pdf'))).toBe('pdf')
  })
  it('erkennt DOCX und Text-Formate als Dokumente-Modul (beide Richtungen)', () => {
    expect(categorize(makeFile('a.docx'))).toBe('docx')
    expect(categorize(makeFile('a.md'))).toBe('docx')
    expect(categorize(makeFile('a.txt'))).toBe('docx')
  })
  it('erkennt Audio/Video', () => {
    expect(categorize(makeFile('a.mp3'))).toBe('av')
    expect(categorize(makeFile('a.mp4'))).toBe('av')
    expect(categorize(makeFile('a.unknownaudio', 'audio/x-custom'))).toBe('av')
  })
  it('fällt auf unknown zurück für nicht unterstützte Formate', () => {
    expect(categorize(makeFile('a.exe'))).toBe('unknown')
  })
})

describe('isVideoFile', () => {
  it('erkennt Video-Dateien an Endung oder MIME-Typ', () => {
    expect(isVideoFile(makeFile('a.mp4'))).toBe(true)
    expect(isVideoFile(makeFile('a.mp3'))).toBe(false)
    expect(isVideoFile(makeFile('a.unknown', 'video/x-custom'))).toBe(true)
  })
})
