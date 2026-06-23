import { apiFetch } from '~/utils/api'

type FFInstance = {
  name: string
  configurations: FFConfiguration[]
}

export type FFConfiguration = {
  name: string
  stubbed: boolean
  version?: string
  parent?: string
  filename?: string
}

export async function fetchInstanceConfigurations(signal?: AbortSignal): Promise<FFInstance> {
  return apiFetch<FFInstance>('/projects/configurations', { signal })
}
