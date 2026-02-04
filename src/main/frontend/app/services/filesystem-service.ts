import { apiFetch } from '~/utils/api'
import type { FilesystemEntry, PathSelectionResponse } from '~/types/filesystem.types'

export const filesystemService = {
  async browse(path = ''): Promise<FilesystemEntry[]> {
    return apiFetch(`/filesystem/browse?path=${encodeURIComponent(path)}`)
  },

  async selectNativePath(): Promise<PathSelectionResponse | null> {
    return apiFetch<PathSelectionResponse | null>('/filesystem/select-native')
  },
}
