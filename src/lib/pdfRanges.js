// Wandelt eine Liste von { from, to } in 0-basierte Seitenindizes für pdf-lib um.
export function rangesToIndices(ranges, maxPage) {
  const indices = new Set()
  const filled = ranges.filter((r) => r.from !== '')
  if (!filled.length) throw new Error('Bitte mindestens eine Seite oder einen Bereich angeben.')

  for (const r of filled) {
    let start = Number(r.from)
    let end = r.to === '' ? start : Number(r.to)
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new Error('Seitenzahlen müssen ganze Zahlen sein.')
    }
    if (start > end) [start, end] = [end, start]
    for (let p = start; p <= end; p++) indices.add(p - 1)
  }

  const sorted = [...indices].sort((a, b) => a - b)
  if (sorted.some((i) => i < 0 || i >= maxPage)) {
    throw new Error(`Seitenzahl außerhalb des gültigen Bereichs (1–${maxPage}).`)
  }
  return sorted
}
