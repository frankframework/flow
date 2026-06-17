/**
 * Extracts the portion of a path after the first occurrence of a marker segment.
 * Returns null if the marker is not found.
 */
export function toRelativePath(absolutePath: string, marker: string): string | null {
  const normalizedPath = normalizePath(absolutePath)
  const normalizedMarker = normalizePath(marker)
  const idx = normalizedPath.indexOf(normalizedMarker)
  return idx === -1 ? null : normalizedPath.slice(idx + normalizedMarker.length)
}

export function normalizePath(path: string) {
  return path.replaceAll('\\', '/')
}

export function getParentPath(path: string): string {
  if (!path) return path // Return empty string if path is empty, small optimization to avoid regex processing
  const parent = path.replace(/\/?[^/]*$/, '')

  if (/^[a-zA-Z]:$/.test(parent)) return `${parent}/`
  return parent
}

/**
 * Removes trailing path separators (`/` or `\`) from a path.
 */
export function stripTrailingSeparators(path: string): string {
  if (!path) return path
  const stripped = path.replace(/[\\/]+$/, '')
  if (stripped === '') return '/'
  if (/^[a-zA-Z]:$/.test(stripped)) return `${stripped}/`
  return stripped
}

export function joinPath(base: string, segment: string): string {
  const trimmedBase = base.replace(/[\\/]+$/, '')
  const trimmedSegment = segment.replace(/^[\\/]+/, '')
  return trimmedBase ? `${trimmedBase}/${trimmedSegment}` : `/${trimmedSegment}`
}
