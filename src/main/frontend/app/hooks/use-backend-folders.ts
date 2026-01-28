import { useAsync } from './use-async'
import { fetchBackendFolders, fetchProjectRoot } from '~/services/project-service'

interface BackendFoldersData {
  folders: string[]
  rootPath: string | null
}

export function useBackendFolders(enabled: boolean) {
  return useAsync<BackendFoldersData>(
    async (signal) => {
      const [folders, rootData] = await Promise.all([fetchBackendFolders(signal), fetchProjectRoot(signal)])
      return { folders, rootPath: rootData.rootPath }
    },
    { enabled },
  )
}
