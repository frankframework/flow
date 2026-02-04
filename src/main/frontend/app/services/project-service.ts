import { apiFetch } from '~/utils/api'
import type { FileTreeNode } from '~/routes/configurations/configuration-manager'
import type { Project, RecentProject } from '~/types/project.types'

export async function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  return apiFetch<Project[]>('/projects', { signal })
}

export async function fetchRecentProjects(signal?: AbortSignal): Promise<RecentProject[]> {
  return apiFetch<RecentProject[]>('/projects/recent', { signal })
}

export async function removeRecentProject(rootPath: string): Promise<void> {
  await apiFetch<void>('/projects/recent', {
    method: 'DELETE',
    body: JSON.stringify({ rootPath }),
  })
}

export async function openProject(rootPath: string): Promise<Project> {
  return apiFetch<Project>('/projects/open', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function cloneProject(repoUrl: string, localPath: string): Promise<Project> {
  return apiFetch<Project>('/projects/clone', {
    method: 'POST',
    body: JSON.stringify({ repoUrl, localPath }),
  })
}

export async function createProject(rootPath: string): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function fetchProjectTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/tree`, { signal })
}

export async function toggleProjectFilter(projectName: string, filter: string, enable: boolean): Promise<void> {
  const action = enable ? 'enable' : 'disable'
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/filters/${encodeURIComponent(filter)}/${action}`, {
    method: 'PATCH',
  })
}
