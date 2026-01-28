import { apiFetch } from '~/utils/api'
import type { FFDoc } from '@frankframework/ff-doc'

export async function fetchFrankDoc(signal?: AbortSignal): Promise<FFDoc> {
  return apiFetch<FFDoc>('/json/frankdoc', { signal })
}
