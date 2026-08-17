const CACHE_NAME = 'shared-files'
const CACHE_KEY = '/shared-file'

export function hasShareParam() {
  return new URLSearchParams(window.location.search).get('shared') === '1'
}

export function clearShareParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('shared')
  window.history.replaceState({}, '', url)
}

export async function consumeSharedFile() {
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(CACHE_KEY)
    if (!response) return null
    const blob = await response.blob()
    const name = decodeURIComponent(response.headers.get('X-File-Name') || 'geteilte-datei')
    await cache.delete(CACHE_KEY)
    return new File([blob], name, { type: blob.type })
  } catch {
    return null
  }
}
