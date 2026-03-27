import { apiFetch } from '~/utils/api'
import type { FileTreeNode } from '~/types/filesystem.types'

export async function fetchProjectTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/configuration`, { signal })
}

export async function fetchShallowConfigurationsTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/configuration?shallow=true`, { signal })
}

export async function fetchProjectRootTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(getTreeUrl(projectName), { signal })
}

export async function fetchDirectoryByPath(
  projectName: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getBaseUrl(projectName)}?path=${encodeURIComponent(path)}`, {
    signal,
  })
}

export async function createFolderInProject(projectName: string, path: string, name: string): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getBaseUrl(projectName)}/folder`, {
    method: 'POST',
    body: JSON.stringify({ path, name }),
  })
}

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}`
}

function getTreeUrl(projectName: string): string {
  return `${getBaseUrl(projectName)}/tree`
}
