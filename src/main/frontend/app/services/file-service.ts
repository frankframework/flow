import type { FileTreeNode } from '~/types/filesystem.types'
import { apiFetch } from '~/utils/api'

export interface FileDTO {
  content: string
  type: string
}

export async function createFile(projectName: string, filePath: string): Promise<void> {
  await updateFile(projectName, filePath, '')
}

export function fetchFile(projectName: string, filepath: string, signal?: AbortSignal): Promise<FileDTO> {
  return apiFetch<FileDTO>(`${getBaseUrl(projectName)}/${encodeURIComponent(filepath)}`, { signal })
}

export function updateFile(projectName: string, filePath: string, fileContent: string): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getBaseUrl(projectName)}/${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    body: fileContent,
  })
}

export function renameFile(projectName: string, oldPath: string, newPath: string): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getBaseUrl(projectName)}/move`, {
    method: 'POST',
    body: JSON.stringify({ oldPath, newPath }),
  })
}

export async function deleteFile(projectName: string, path: string): Promise<void> {
  await apiFetch<void>(`${getBaseUrl(projectName)}/${encodeURIComponent(path)}`, { method: 'DELETE' })
}

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}/files`
}
