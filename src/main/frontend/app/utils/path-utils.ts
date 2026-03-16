import type { Project } from '~/types/project.types'

/**
 * Extracts the portion of a path after the first occurrence of a marker segment.
 * Returns null if the marker is not found.
 */
export function toRelativePath(absolutePath: string, marker: string): string | null {
  const normalized = absolutePath.replaceAll('\\', '/')
  const idx = normalized.indexOf(marker)
  return idx === -1 ? null : normalized.slice(idx + marker.length)
}

/**
 * Converts a file path to a project-relative path for display.
 * Handles both local and cloud environments
 */
export function toProjectRelativePath(absolutePath: string, project: Project): string {
  const path = absolutePath.replaceAll('\\', '/')
  const root = project.rootPath.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const normalizedPath = path.replace(/^\/+/, '')

  if (normalizedPath === root) {
    return `${project.name}/`
  }

  const relative = toRelativePath(normalizedPath, `${root}/`)
  if (relative !== null) {
    return `${project.name}/${relative}`
  }

  return path
}
