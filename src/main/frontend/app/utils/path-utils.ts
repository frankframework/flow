import type { Project } from '~/types/project.types'

/**
 * Converts a file path to a project-relative path for display.
 * Handles both local and cloud environments
 */
export function toProjectRelativePath(absolutePath: string, project: Project): string {
  const path = absolutePath.replaceAll('\\', '/')
  const root = project.rootPath.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const normalizedPath = path.replace(/^\/+/, '')

  if (normalizedPath === root || normalizedPath.startsWith(`${root}/`)) {
    const relative = normalizedPath.slice(root.length).replace(/^\/+/, '')
    return `${project.name}/${relative}`
  }

  return path
}
