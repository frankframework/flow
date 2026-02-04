import { useAsync } from './use-async'
import { fetchProjects } from '~/services/project-service'
import type { Project } from '~/routes/projectlanding/project-landing'

export function useProjects() {
  return useAsync<Project[]>((signal) => fetchProjects(signal))
}
