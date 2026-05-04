import { apiFetch } from '~/utils/api'

interface FFInstance {
  name: string
  configurations: FFConfiguration[]
}

export interface FFConfiguration {
  name: string
  stubbed: boolean
  version?: string
  parent?: string
  filename?: string
}

export async function fetchInstanceConfigurations(signal?: AbortSignal): Promise<FFInstance> {
  return apiFetch<FFInstance>('/projects/configurations', { signal })
}
