const KEY = 'filetool:presets:image'

export function getPresets() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePreset(name, settings) {
  const presets = getPresets().filter((p) => p.name !== name)
  presets.push({ name, ...settings })
  try {
    localStorage.setItem(KEY, JSON.stringify(presets))
  } catch {
    // ignorieren (z. B. Private Mode)
  }
  return presets
}

export function deletePreset(name) {
  const presets = getPresets().filter((p) => p.name !== name)
  try {
    localStorage.setItem(KEY, JSON.stringify(presets))
  } catch {
    // ignorieren
  }
  return presets
}
