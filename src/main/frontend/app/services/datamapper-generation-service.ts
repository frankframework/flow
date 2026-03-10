import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { apiFetch } from '~/utils/api'

export async function generateDatamapperXSLT(projectName: string, content: string): Promise<void> {
  await apiFetch<void>(`/datamapper/${encodeURIComponent(projectName)}/generate`, {
    method: 'PUT',
    body: content,
  })
}
