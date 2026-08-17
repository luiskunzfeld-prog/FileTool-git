const TABLE_EXTENSIONS = ['csv', 'xlsx', 'xls', 'json']
const UNSUPPORTED_IMAGE_EXTENSIONS = ['svg', 'heic', 'heif']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi']

export function getExtension(file) {
  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1)
}

/**
 * Grobe Einordnung einer Datei in eines der Konverter-Module.
 * 'image'   -> per <canvas> konvertierbar (JPG/PNG/WebP)
 * 'table'   -> CSV / XLSX / JSON
 * 'pdf'     -> Zusammenführen / Seiten extrahieren / Rotieren (pdf-lib)
 * 'docx'    -> Umwandeln in Text/HTML/Markdown (mammoth + turndown)
 * 'av'      -> Audio/Video: konvertieren, schneiden, Ton extrahieren (ffmpeg.wasm)
 * 'unknown' -> noch kein Modul dafür (Extras folgen später)
 */
export function categorize(file) {
  const ext = getExtension(file)

  if (file.type.startsWith('image/') && !UNSUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
    return 'image'
  }
  if (TABLE_EXTENSIONS.includes(ext)) {
    return 'table'
  }
  if (ext === 'pdf') {
    return 'pdf'
  }
  if (ext === 'docx') {
    return 'docx'
  }
  if (
    AUDIO_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext) ||
    file.type.startsWith('audio/') || file.type.startsWith('video/')
  ) {
    return 'av'
  }
  return 'unknown'
}

export function isVideoFile(file) {
  const ext = getExtension(file)
  return VIDEO_EXTENSIONS.includes(ext) || file.type.startsWith('video/')
}
