import type { FileTreeNode } from '~/types/filesystem.types'
import { apiFetch } from '~/utils/api'

export async function createFile(projectName: string, filePath: string): Promise<void> {
  await updateFile(projectName, filePath, '')
}

export async function fetchFile(projectName: string, filepath: string, signal?: AbortSignal): Promise<string> {
  const { content } = await apiFetch<{ content: string }>(
    `${getBaseUrl(projectName)}/${encodeURIComponent(filepath)}`,
    { signal },
  )
  return content
}

export async function updateFile(projectName: string, filePath: string, fileContent: string): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`${getBaseUrl(projectName)}/${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    body: fileContent,
  })
}

export async function renameFile(projectName: string, oldPath: string, newPath: string): Promise<FileTreeNode> {
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
