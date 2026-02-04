import { apiFetch } from '~/utils/api'
import type { FilesystemEntry } from '~/types/filesystem.types'

export const filesystemService = {
  async browse(path = ''): Promise<FilesystemEntry[]> {
    return apiFetch(`/filesystem/browse?path=${encodeURIComponent(path)}`)
  },
}
