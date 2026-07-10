export function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

export function containsPathSeparator(path: string): boolean {
  return /[/\\]/.test(path)
}

export const SAFE_NAME_PATTERN = /^(?!.*\.\.)[A-Za-z0-9 ._-]*$/

export function hasUnsafeNameChars(name: string): boolean {
  return !SAFE_NAME_PATTERN.test(name)
}

/**
 * Removes trailing path separators from a path, keeping filesystem roots intact
 */
export function stripTrailingSeparators(path: string): string {
  if (!path) return path
  const stripped = normalizePath(path).replace(/\/+$/, '')
  if (stripped === '') return '/'
  if (/^[a-zA-Z]:$/.test(stripped)) return `${stripped}/`
  return stripped
}

export function getBaseName(path: string): string {
  const normalized = stripTrailingSeparators(path)
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

export function getParentPath(path: string): string {
  if (!path) return path
  const parent = normalizePath(path).replace(/\/?[^/]*$/, '')
  if (/^[a-zA-Z]:$/.test(parent)) return `${parent}/`
  return parent
}

export function joinPath(base: string, segment: string): string {
  const trimmedBase = normalizePath(base).replace(/\/+$/, '')
  const trimmedSegment = normalizePath(segment).replace(/^\/+/, '')
  return trimmedBase ? `${trimmedBase}/${trimmedSegment}` : `/${trimmedSegment}`
}

export function relativeTo(base: string, target: string): string | null {
  const normalizedBase = stripTrailingSeparators(base)
  const normalizedTarget = stripTrailingSeparators(target)
  if (normalizedTarget === normalizedBase) return ''
  const prefix = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`
  return normalizedTarget.startsWith(prefix) ? normalizedTarget.slice(prefix.length) : null
}
