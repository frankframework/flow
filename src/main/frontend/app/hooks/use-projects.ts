import { useAsync, type UseAsyncResult } from './use-async'
import type { RecentConfigurationProject } from '~/types/project.types'
import { fetchRecentProjects } from '~/services/recent-project-service'

export function useRecentProjects(): UseAsyncResult<RecentConfigurationProject[]> {
  return useAsync<RecentConfigurationProject[]>((signal): Promise<RecentConfigurationProject[]> =>
    fetchRecentProjects(signal),
  )
}
