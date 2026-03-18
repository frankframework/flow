import type { XmlResponse } from '~/types/project.types'
import { apiFetch } from '~/utils/api'

export async function normalizeXml(xmlContent: string): Promise<XmlResponse> {
  return apiFetch<XmlResponse>('/xml/normalize', {
    method: 'POST',
    body: JSON.stringify({ xmlContent }),
  })
}
