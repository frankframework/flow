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
  return path.replace(/\/?[^/]*$/, '')
}
