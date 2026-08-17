const TABLE_EXTENSIONS = ['csv', 'xlsx', 'xls', 'json']
const UNSUPPORTED_IMAGE_EXTENSIONS = ['svg', 'heic', 'heif']

export function getExtension(file) {
  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1)
}

/**
 * Grobe Einordnung einer Datei in eines der Konverter-Module.
 * 'image'   -> per <canvas> konvertierbar (JPG/PNG/WebP)
 * 'table'   -> CSV / XLSX / JSON
 * 'unknown' -> noch kein Modul dafür (Dokumente, Audio/Video, Extras folgen später)
 */
export function categorize(file) {
  const ext = getExtension(file)

  if (file.type.startsWith('image/') && !UNSUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
    return 'image'
  }
  if (TABLE_EXTENSIONS.includes(ext)) {
    return 'table'
  }
  return 'unknown'
}
