import { apiUrl } from '~/utils/api'

export async function fetchFrankConfigXsd(signal?: AbortSignal): Promise<string> {
  const response = await fetch(apiUrl('/xsd/frankconfig'), { signal })
  if (!response.ok) throw new Error(`Failed to fetch FrankConfig XSD: ${response.statusText}`)
  return response.text()
}
