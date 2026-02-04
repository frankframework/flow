import { apiFetch } from '~/utils/api'
import type { Project } from '~/types/project.types'

export async function fetchConfiguration(projectName: string, filepath: string, signal?: AbortSignal): Promise<string> {
  const data = await apiFetch<{ content: string }>(`/projects/${encodeURIComponent(projectName)}/configuration`, {
    method: 'POST',
    body: JSON.stringify({ filepath }),
    signal,
  })
  return data.content
}

export async function saveConfiguration(projectName: string, filepath: string, content: string): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/configuration`, {
    method: 'PUT',
    body: JSON.stringify({ filepath, content }),
  })
}

export async function createConfiguration(projectName: string, filename: string): Promise<Project> {
  return apiFetch<Project>(
    `/projects/${encodeURIComponent(projectName)}/configurations/${encodeURIComponent(filename)}`,
    { method: 'POST' },
  )
}
