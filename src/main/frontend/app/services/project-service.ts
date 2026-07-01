import { zipSync } from 'fflate'
import { apiFetch, apiUrl } from '~/utils/api'
import type { ConfigurationProject } from '~/types/project.types'

export const DEFAULT_MAX_IMPORT_BYTES = 80 * 1024 * 1024

export class ImportTooLargeError extends Error {
  constructor(
    public readonly bytes: number,
    public readonly kind: 'compressed' | 'uncompressed' = 'compressed',
  ) {
    super('Configuration is too large to import')
    this.name = 'ImportTooLargeError'
  }
}

export async function fetchProject(name: string): Promise<ConfigurationProject> {
  return apiFetch<ConfigurationProject>(`/projects/${encodeURIComponent(name)}`)
}

export async function openProject(rootPath: string): Promise<ConfigurationProject> {
  return apiFetch<ConfigurationProject>('/projects/open', {
    method: 'POST',
    body: JSON.stringify({ rootPath }),
  })
}

export async function cloneProject(repoUrl: string, localPath: string, token?: string): Promise<ConfigurationProject> {
  return apiFetch<ConfigurationProject>('/projects/clone', {
    method: 'POST',
    body: JSON.stringify({ repoUrl, localPath, token: token ?? null }),
  })
}

export async function createProject(name: string, rootPath: string): Promise<ConfigurationProject> {
  return apiFetch<ConfigurationProject>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, rootPath }),
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

export async function importProjectFolder(files: FileList, maxImportBytes: number): Promise<ConfigurationProject> {
  const projectName = files[0].webkitRelativePath.split('/')[0]

  /*
   * pre-check on the uncompressed size so an oversized folder fails fast,
   */
  let uncompressedBytes = 0
  for (const file of files) {
    if (file.webkitRelativePath.split('/').slice(1).join('/')) {
      uncompressedBytes += file.size
    }
  }

  if (uncompressedBytes > maxImportBytes) {
    throw new ImportTooLargeError(uncompressedBytes, 'uncompressed')
  }

  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    const relativePath = file.webkitRelativePath.split('/').slice(1).join('/')
    if (!relativePath) continue
    entries[relativePath] = new Uint8Array(await file.arrayBuffer())
  }

  const archive = await zipAsync(entries)

  if (archive.byteLength > maxImportBytes) {
    throw new ImportTooLargeError(archive.byteLength, 'compressed')
  }

  const formData = new FormData()
  formData.append('projectName', projectName)
  formData.append('file', new Blob([archive], { type: 'application/zip' }), `${projectName}.zip`)

  return apiFetch<ConfigurationProject>('/projects/import', {
    method: 'POST',
    body: formData,
  })
}

async function zipAsync(entries: Record<string, Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  return zipSync(entries, { level: 6 }) as Uint8Array<ArrayBuffer>
}
