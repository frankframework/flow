import { apiFetch } from '~/utils/api'
import type { FileTreeNode } from '~/routes/configurations/configuration-manager'

export async function fetchProjectTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/tree/configurations`, { signal })
}

export async function fetchProjectRootTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/tree`, { signal })
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
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/files/rename`, {
    method: 'PATCH',
    body: JSON.stringify({ oldPath, newName }),
  })
}

export async function deleteInProject(projectName: string, path: string): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })
}
