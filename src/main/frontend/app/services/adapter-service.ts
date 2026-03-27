import type { XmlResponse } from '~/types/project.types'
import { apiFetch } from '~/utils/api'

export async function saveAdapter(
  projectName: string,
  adapterXml: string,
  adapterName: string,
  configPath: string,
): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/adapters`, {
    method: 'PUT',
    body: JSON.stringify({
      adapterXml,
      adapterName,
      configurationPath: configPath,
    }),
  })
}

export async function getAdapter(projectName: string, adapterName: string, configPath: string): Promise<XmlResponse> {
  return apiFetch<XmlResponse>(
    `/projects/${encodeURIComponent(projectName)}/adapters/${encodeURIComponent(adapterName)}?configurationPath=${encodeURIComponent(configPath)}`,
    {
      method: 'GET',
    },
  )
}

export async function createAdapter(
  projectName: string,
  adapterName: string,
  configurationPath: string,
): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/adapters`, {
    method: 'POST',
    body: JSON.stringify({ adapterName, configurationPath }),
  })
}

export async function renameAdapter(
  projectName: string,
  oldName: string,
  newName: string,
  configurationPath: string,
): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/adapters/rename`, {
    method: 'PATCH',
    body: JSON.stringify({ oldName, newName, configurationPath }),
  })
}

export async function deleteAdapter(
  projectName: string,
  adapterName: string,
  configurationPath: string,
): Promise<void> {
  await apiFetch<void>(
    `/projects/${encodeURIComponent(projectName)}/adapters?adapterName=${encodeURIComponent(adapterName)}&configurationPath=${encodeURIComponent(configurationPath)}`,
    { method: 'DELETE' },
  )
}
