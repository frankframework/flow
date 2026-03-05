import { apiFetch } from '~/utils/api'
import type { FFDocJson } from '@frankframework/doc-library-core'

export async function fetchFrankDoc(signal?: AbortSignal): Promise<FFDocJson> {
  return apiFetch<FFDocJson>('/json/frankdoc', { signal })
}
