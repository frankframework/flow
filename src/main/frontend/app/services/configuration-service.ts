import { apiFetch } from '~/utils/api'
import type { XmlResponse } from '~/types/project.types'

const configCache = new Map<string, string>()

export function clearConfigurationCache(projectName?: string, filepath?: string) {
  if (projectName && filepath) {
    configCache.delete(`${projectName}:${filepath}`)
  } else {
    configCache.clear()
  }
}

export async function fetchConfigurationCached(
  projectName: string,
  filepath: string,
  signal?: AbortSignal,
): Promise<string> {
  const key = `${projectName}:${filepath}`
  if (configCache.has(key)) return configCache.get(key)!
  const xml = await fetchConfiguration(projectName, filepath, signal)
  configCache.set(key, xml)
  return xml
}

export async function fetchConfiguration(projectName: string, filepath: string, signal?: AbortSignal): Promise<string> {
  const { content } = await apiFetch<{ content: string }>(`${getBaseUrl(projectName)}?filepath=${filepath}`, {
    method: 'GET',
    signal,
  })
  return content
}

export async function saveConfiguration(projectName: string, filepath: string, content: string): Promise<XmlResponse> {
  return apiFetch<XmlResponse>(getBaseUrl(projectName), {
    method: 'POST',
    body: JSON.stringify({ filepath, content }),
  })
}

export async function createConfiguration(projectName: string, filename: string): Promise<XmlResponse> {
  return apiFetch<XmlResponse>(`${getBaseUrl(projectName)}/${encodeURIComponent(filename)}`, { method: 'POST' })
}

function getBaseUrl(projectName: string) {
  return `/projects/${encodeURIComponent(projectName)}/configuration`
}
