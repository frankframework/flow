import { apiFetch } from '~/utils/api'
import type { FileTreeNode } from '~/types/filesystem.types'

export async function fetchProjectTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/configurations`, { signal })
}

export async function fetchShallowConfigurationsTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getTreeUrl(projectName)}/configurations?shallow=true`, { signal })
}

export async function fetchProjectRootTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(getTreeUrl(projectName), { signal })
}

export async function fetchDirectoryByPath(
  projectName: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}?path=${encodeURIComponent(path)}`, {
    signal,
  })
}

export async function createFileInProject(
  projectName: string,
  parentPath: string,
  name: string,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/files`, {
    method: 'POST',
    body: JSON.stringify({ path: parentPath, name }),
  })
}

export async function createFolderInProject(
  projectName: string,
  parentPath: string,
  name: string,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/folders`, {
    method: 'POST',
    body: JSON.stringify({ path: parentPath, name }),
  })
}

export async function renameInProject(projectName: string, oldPath: string, newName: string): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getFilesUrl(projectName)}/rename`, {
    method: 'PATCH', // TODO this should be POST
    body: JSON.stringify({ oldPath, newName }),
  })
}

// TODO saveFile (none configuration)

export async function deleteInProject(projectName: string, path: string): Promise<void> {
  await apiFetch<void>(`${getFilesUrl(projectName)}/${encodeURIComponent(path)}`, { method: 'DELETE' })
}

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}`
}

function getFilesUrl(projectName: string): string {
  return `${getBaseUrl(projectName)}/files`
}

function getTreeUrl(projectName: string): string {
  return `${getBaseUrl(projectName)}/tree`
}
