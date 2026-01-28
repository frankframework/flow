import { apiUrl } from '~/utils/api'
import type { FFDoc } from '@frankframework/ff-doc'

const FRANK_DOC_PATH = '/json/frankdoc'

export async function fetchFrankDoc(): Promise<FFDoc> {
  const url = apiUrl(FRANK_DOC_PATH)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch FrankDoc: ${response.status}`)
  }

  return response.json()
}
