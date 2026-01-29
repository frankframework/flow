import { useAsync } from './use-async'
import { fetchProjectTree } from '~/services/project-service'
import type { FileTreeNode } from '~/routes/configurations/configuration-manager'

export function useProjectTree(projectName: string | undefined) {
  return useAsync<FileTreeNode>((signal) => fetchProjectTree(projectName!, signal), {
    enabled: !!projectName,
    key: projectName,
  })
}
