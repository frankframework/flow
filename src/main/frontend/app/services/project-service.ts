import { apiFetch, apiUrl } from '~/utils/api'
import type { FileTreeNode } from '~/types/filesystem.types'
import type { Project } from '~/types/project.types'

export async function fetchProject(name: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(name)}`)
}

export async function openProject(rootPath: string): Promise<Project> {
  return apiFetch<Project>('/projects/open', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function cloneProject(repoUrl: string, localPath: string, token?: string): Promise<Project> {
  return apiFetch<Project>('/projects/clone', {
    method: 'POST',
    body: JSON.stringify({ repoUrl, localPath, token: token || null }),
  })
}

export async function createProject(rootPath: string): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function fetchProjectTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/tree/configurations`, { signal })
}

export async function fetchShallowConfigurationsTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/tree/configurations?shallow=true`, {
    signal,
  })
}

export async function fetchProjectRootTree(projectName: string, signal?: AbortSignal): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(`/projects/${encodeURIComponent(projectName)}/tree`, { signal })
}

export async function fetchFolderContents(
  projectName: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileTreeNode> {
  return apiFetch<FileTreeNode>(
    `/projects/${encodeURIComponent(projectName)}/folder?path=${encodeURIComponent(path)}`,
    { signal },
  )
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

export async function toggleProjectFilter(projectName: string, filter: string, enable: boolean): Promise<void> {
  const action = enable ? 'enable' : 'disable'
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/filters/${encodeURIComponent(filter)}/${action}`, {
    method: 'PATCH',
  })
}

export async function exportProject(projectName: string): Promise<void> {
  const url = apiUrl(`/projects/${encodeURIComponent(projectName)}/export`)
  const sessionId = sessionStorage.getItem('frankflow_anon_session_id') ?? ''

  const headers: Record<string, string> = { 'X-Session-ID': sessionId }
  const token = localStorage.getItem('access_token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error('Export failed')

  const blob = await response.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${projectName}.zip`
  a.click()
  URL.revokeObjectURL(a.href)
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

export async function importProjectFolder(files: FileList): Promise<Project> {
  const formData = new FormData()

  const firstPath = files[0].webkitRelativePath
  const projectName = firstPath.split('/')[0]
  formData.append('projectName', projectName)

  for (const file of files) {
    formData.append('files', file)
    const relativePath = file.webkitRelativePath.split('/').slice(1).join('/')
    formData.append('paths', relativePath)
  }

  return apiFetch<Project>('/projects/import', {
    method: 'POST',
    body: formData,
  })
}

export { type FileTreeNode } from '~/types/filesystem.types'
