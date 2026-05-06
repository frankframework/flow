import { useAsync } from './use-async'
import type { RecentConfigurationProject } from '~/types/project.types'
import { fetchRecentProjects } from '~/services/recent-project-service'

export function useRecentProjects() {
  return useAsync<RecentConfigurationProject[]>((signal) => fetchRecentProjects(signal))
}
