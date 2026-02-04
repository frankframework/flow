import { useAsync } from './use-async'
import { fetchRecentProjects } from '~/services/project-service'
import type { RecentProject } from '~/types/project.types'

export function useRecentProjects() {
  return useAsync<RecentProject[]>((signal) => fetchRecentProjects(signal))
}
