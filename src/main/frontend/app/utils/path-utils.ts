/**
 * Extracts the portion of a path after the first occurrence of a marker segment.
 * Returns null if the marker is not found.
 */
export function toRelativePath(absolutePath: string, marker: string): string | null {
  const normalized = absolutePath.replaceAll('\\', '/')
  const idx = normalized.indexOf(marker)
  return idx === -1 ? null : normalized.slice(idx + marker.length)
}
