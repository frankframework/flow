import { apiFetch } from '~/utils/api'
import type { Project } from '~/routes/projectlanding/project-landing'
import type { FileTreeNode } from '~/routes/configurations/configuration-manager'

export async function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  return apiFetch<Project[]>('/projects', { signal })
}

export async function openProject(rootPath: string): Promise<Project> {
  return apiFetch<Project>('/projects/open', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function createProject(rootPath: string): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function fetchBackendFolders(signal?: AbortSignal): Promise<string[]> {
  return apiFetch<string[]>('/projects/backend-folders', { signal })
}

export async function fetchProjectRoot(signal?: AbortSignal): Promise<{ rootPath: string }> {
  return apiFetch<{ rootPath: string }>('/projects/root', { signal })
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
