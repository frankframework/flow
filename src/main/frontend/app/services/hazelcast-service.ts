import { apiFetch } from '~/utils/api'

export interface FrankInstance {
  name: string
  id: string
  projectPath: string | null
}

export async function discoverFrankInstances(signal?: AbortSignal): Promise<FrankInstance[]> {
  return apiFetch<FrankInstance[]>('/hazelcast/instances', { signal })
}
