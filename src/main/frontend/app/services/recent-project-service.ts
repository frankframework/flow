import type { RecentProject } from '~/types/project.types'
import { apiFetch } from '~/utils/api'

export async function fetchRecentProjects(signal?: AbortSignal): Promise<RecentProject[]> {
  return apiFetch<RecentProject[]>('/recent-projects', { signal })
}

export async function removeRecentProject(rootPath: string): Promise<void> {
  await apiFetch<void>('/recent-projects', {
    method: 'DELETE',
    body: JSON.stringify({ rootPath }),
  })
}
