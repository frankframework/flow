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

export async function fetchEditorDirectoryByPath(
  projectName: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/editor/directory?path=${encodeURIComponent(path)}`, {
    signal,
  })
}

export async function fetchStudioDirectoryByPath(
  projectName: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/studio/directory?path=${encodeURIComponent(path)}`, {
    signal,
  })
}

export async function fetchAncestorPath(
  projectName: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/ancestors?path=${encodeURIComponent(path)}`, {
    signal,
  })
}

export async function createFolderInProject(projectName: string, path: string): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getBaseUrl(projectName)}/folder`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}`
}

function getTreeUrl(projectName: string): string {
  return `${getBaseUrl(projectName)}/tree`
}
