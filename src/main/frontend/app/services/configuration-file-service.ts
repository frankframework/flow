import { apiFetch } from '~/utils/api'
import type { AdapterLocationResponse, XmlResponse } from '~/types/project.types'

const configCache = new Map<string, string>()

export function clearConfigurationFileCache(projectName?: string, filepath?: string) {
  if (projectName && filepath) {
    configCache.delete(`${projectName}:${filepath}`)
  } else {
    configCache.clear()
  }
}

export async function fetchConfigurationFileCached(
  projectName: string,
  filepath: string,
  signal?: AbortSignal,
): Promise<string> {
  const key = `${projectName}:${filepath}`
  if (configCache.has(key)) return configCache.get(key)!
  const xml = await fetchConfigurationFile(projectName, filepath, signal)
  configCache.set(key, xml)
  return xml
}

export async function fetchConfigurationFile(
  projectName: string,
  filepath: string,
  signal?: AbortSignal,
): Promise<string> {
  const { content } = await apiFetch<{ content: string }>(
    `${getBaseUrl(projectName)}?path=${encodeURIComponent(filepath)}`,
    { signal },
  )
  return content
}

export async function saveConfigurationFile(
  projectName: string,
  filepath: string,
  content: string,
  format = false,
): Promise<XmlResponse> {
  const formatParam = format ? '&format=true' : ''
  return apiFetch<XmlResponse>(`${getBaseUrl(projectName)}?path=${encodeURIComponent(filepath)}${formatParam}`, {
    method: 'PUT',
    body: content,
  })
}

export async function createConfigurationFile(projectName: string, filepath: string): Promise<AdapterLocationResponse> {
  return apiFetch<AdapterLocationResponse>(`${getBaseUrl(projectName)}?path=${encodeURIComponent(filepath)}`, {
    method: 'POST',
  })
}

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}/configuration`
}
