import { apiFetch } from '~/utils/api'
import { parseXsd, getFirstLevelElementsForType } from '~/utils/xsd-utils'
import type { Elements } from '@frankframework/doc-library-core'

export interface NonCanvasElement {
  tagName: string
  name: string | null
  index: number
  attributes: Record<string, string>
}

const ROOT_TYPE_CANDIDATES = ['ConfigurationType', 'ModuleType', 'Configuration', 'Module']

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}/non-canvas-elements`
}

export function getAddableNonCanvasElementNames(xsdContent: string | null, elements: Elements | null): string[] {
  if (!xsdContent || !elements) return []

  const xsdDocument = parseXsd(xsdContent)
  const names = new Set<string>()
  for (const rootType of ROOT_TYPE_CANDIDATES) {
    for (const name of getFirstLevelElementsForType(xsdDocument, rootType)) names.add(name)
  }
  names.delete('Adapter')

  return [...names].filter((name) => elements[name]).toSorted((first, second) => first.localeCompare(second))
}

export async function getNonCanvasElementsFromConfiguration(
  projectName: string,
  configurationPath: string,
  signal?: AbortSignal,
): Promise<NonCanvasElement[]> {
  return apiFetch<NonCanvasElement[]>(
    `${getBaseUrl(projectName)}?configurationPath=${encodeURIComponent(configurationPath)}`,
    { signal },
  )
}

export async function addNonCanvasElement(
  projectName: string,
  configurationPath: string,
  tagName: string,
  attributes: Record<string, string>,
): Promise<NonCanvasElement[]> {
  return apiFetch<NonCanvasElement[]>(getBaseUrl(projectName), {
    method: 'POST',
    body: JSON.stringify({ configurationPath, tagName, attributes }),
  })
}

export async function updateNonCanvasElement(
  projectName: string,
  configurationPath: string,
  tagName: string,
  index: number,
  attributes: Record<string, string>,
): Promise<NonCanvasElement[]> {
  return apiFetch<NonCanvasElement[]>(getBaseUrl(projectName), {
    method: 'PUT',
    body: JSON.stringify({ configurationPath, tagName, index, attributes }),
  })
}

export async function deleteNonCanvasElement(
  projectName: string,
  configurationPath: string,
  tagName: string,
  index: number,
): Promise<NonCanvasElement[]> {
  const query = `configurationPath=${encodeURIComponent(configurationPath)}&tagName=${encodeURIComponent(tagName)}&index=${index}`
  return apiFetch<NonCanvasElement[]>(`${getBaseUrl(projectName)}?${query}`, { method: 'DELETE' })
}
