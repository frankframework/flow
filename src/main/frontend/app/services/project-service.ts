import { apiFetch } from '~/utils/api'
import type { Project } from '~/routes/projectlanding/project-landing'
import type { FileTreeNode } from '~/routes/configurations/configuration-manager'

export interface ConfigImport {
  filepath: string
  xmlContent: string
}

export async function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  return apiFetch<Project[]>('/projects', { signal })
}

export async function fetchProject(name: string, signal?: AbortSignal): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(name)}`, { signal })
}

export async function createProject(name: string, rootPath?: string): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name,
      rootPath: rootPath ?? undefined,
    }),
  })
}

export async function importConfigurations(projectName: string, configs: ConfigImport[]): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/import-configurations`, {
    method: 'POST',
    body: JSON.stringify({
      projectName,
      configurations: configs,
    }),
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
