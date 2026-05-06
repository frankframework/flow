import { apiFetch } from '~/utils/api'
import type { BrowseResult } from '~/types/filesystem.types'

export const filesystemService = {
  async browse(path = ''): Promise<BrowseResult> {
    return apiFetch(`/filesystem/browse?path=${encodeURIComponent(path)}`)
  },

  async getDefaultPath(): Promise<string> {
    const result = await apiFetch<{ path: string }>('/filesystem/default-path')
    return result.path
  },

  async resolveNearestAccessiblePath(path: string): Promise<string> {
    const result = await this.browse(path)
    return result.resolvedPath
  },
}

export function getParentPath(path: string): string {
  if (/^[a-zA-Z]:[/\\]?$/.test(path) || path === '/') return ''
  const parent = path.replace(/[\\/][^\\/]*$/, '')
  if (!parent || parent === path) return ''
  if (/^[a-zA-Z]:$/.test(parent)) return `${parent}\\`
  return parent
}
