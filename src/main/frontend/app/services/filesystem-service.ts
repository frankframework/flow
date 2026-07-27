import { apiFetch } from '~/utils/api'
import type { BrowseResult } from '~/types/filesystem.types'

export const filesystemService = {
  async browse(path = ''): Promise<BrowseResult> {
    return apiFetch(`/filesystem/browse?path=${encodeURIComponent(path)}`)
  },

  async resolveNearestAccessiblePath(path: string): Promise<string> {
    // eslint-disable-next-line unicorn/no-this-outside-of-class
    const result = await this.browse(path)
    return result.resolvedPath
  },

  async createDirectory(path: string): Promise<void> {
    return apiFetch(`/filesystem/mkdir?path=${encodeURIComponent(path)}`, { method: 'POST' })
  },
}
