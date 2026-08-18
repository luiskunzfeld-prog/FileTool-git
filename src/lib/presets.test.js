import { describe, it, expect, beforeEach } from 'vitest'
import { getPresets, savePreset, deletePreset } from './presets'

beforeEach(() => {
  localStorage.clear()
})

describe('presets', () => {
  it('startet leer', () => {
    expect(getPresets()).toEqual([])
  })

  it('speichert und liest ein Preset', () => {
    savePreset('Web-Export', { targetFormat: 'image/webp', quality: 0.8, maxWidth: '1920' })
    const presets = getPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0]).toMatchObject({ name: 'Web-Export', targetFormat: 'image/webp' })
  })

  it('überschreibt ein Preset mit demselben Namen statt zu duplizieren', () => {
    savePreset('Web-Export', { targetFormat: 'image/webp', quality: 0.8, maxWidth: '1920' })
    savePreset('Web-Export', { targetFormat: 'image/jpeg', quality: 0.6, maxWidth: '800' })
    const presets = getPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].targetFormat).toBe('image/jpeg')
  })

  it('löscht ein Preset', () => {
    savePreset('A', { targetFormat: 'image/png', quality: 1, maxWidth: '' })
    savePreset('B', { targetFormat: 'image/png', quality: 1, maxWidth: '' })
    deletePreset('A')
    const presets = getPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('B')
  })
})
