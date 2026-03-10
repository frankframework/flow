import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { apiFetch } from '~/utils/api'

export async function fetchDatamapperConfiguration(projectName: string): Promise<MappingListConfig> {
  const data = await apiFetch<MappingListConfig>(`/datamapper/${encodeURIComponent(projectName)}/configuration`, {
    method: 'GET',
  })
  console.dir(data)
  return data
}

export async function saveDatamapperConfiguration(projectName: string, content: string): Promise<void> {
  await apiFetch<void>(`/datamapper/${encodeURIComponent(projectName)}/configuration`, {
    method: 'PUT',
    body: content,
  })
}

export async function generateDatamapperXSLT(projectName: string, content: string): Promise<void> {
  await apiFetch<void>(`/datamapper/${encodeURIComponent(projectName)}/generate`, {
    method: 'PUT',
    body: content,
  })
}
