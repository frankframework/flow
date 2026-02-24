import type { XmlResponse } from '~/types/project.types'
import { apiFetch } from '~/utils/api'

export async function validateXml(xmlContent: string): Promise<void> {
  return apiFetch<void>('/xml/validate', {
    method: 'POST',
    body: JSON.stringify({ xmlContent }),
  })
}

export async function normalizeXml(xmlContent: string): Promise<XmlResponse> {
  return apiFetch<XmlResponse>('/xml/normalize', {
    method: 'POST',
    body: JSON.stringify({ xmlContent }),
  })
}
