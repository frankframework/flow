import { apiFetch } from '~/utils/api'

export interface FFConfiguration {
  name: string
  stubbed: boolean
  version?: string
  parent?: string
  filename?: string
}

export async function fetchInstanceConfigurations(signal?: AbortSignal): Promise<FFConfiguration[]> {
  return apiFetch<FFConfiguration[]>('/projects/configurations', { signal })
}
