import { useAsync } from './use-async'
import type { RecentProject } from '~/types/project.types'
import { fetchRecentProjects } from '~/services/recent-project-service'

export function useRecentProjects() {
  return useAsync<RecentProject[]>((signal) => fetchRecentProjects(signal))
}
