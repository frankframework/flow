import { apiFetch } from '~/utils/api'
import { parseXsd, getFirstLevelElementsForType, getAllowedChildElementsForElement } from '~/utils/xsd-utils'
import type { Elements } from '@frankframework/doc-library-core'

export type NonCanvasComponent = {
  tagName: string
  name: string | null
  index: number
  attributes: Record<string, string>
}

const ROOT_TYPE_CANDIDATES = ['ConfigurationType', 'ModuleType', 'Configuration', 'Module']
const EXCLUDED_NAMES = new Set(['Adapter'])
const NON_EXPANDABLE_NAMES = new Set(['Module', 'Configuration'])
const PARAMETER_COMPONENT_LABEL = 'Parameters'

function getBaseUrl(projectName: string): string {
  return `/projects/${encodeURIComponent(projectName)}/non-canvas-components`
}

export function getAddableNonCanvasComponentNames(xsdContent: string | null, elements: Elements | null): string[] {
  if (!xsdContent || !elements) return []

  const xsdDocument = parseXsd(xsdContent)

  const hasNameAttribute = (name: string): boolean => Boolean(elements[name]?.attributes?.['name'])
  const isParameter = (name: string): boolean => elements[name]?.labels?.['Components'] === PARAMETER_COMPONENT_LABEL

  const addableNames: string[] = []
  const visitedNames = new Set<string>()

  const collect = (name: string): void => {
    if (EXCLUDED_NAMES.has(name) || visitedNames.has(name)) return
    visitedNames.add(name)

    if (!Object.hasOwn(elements, name)) return

    if (hasNameAttribute(name) || NON_EXPANDABLE_NAMES.has(name)) {
      addableNames.push(name)
      return
    }

    const childNames = getAllowedChildElementsForElement(xsdDocument, name).filter(
      (childName): boolean => childName !== name && elements[childName] && !isParameter(childName),
    )

    if (childNames.length === 0) {
      addableNames.push(name)
      return
    }

    for (const childName of childNames) collect(childName)
  }

  for (const rootType of ROOT_TYPE_CANDIDATES) {
    for (const name of getFirstLevelElementsForType(xsdDocument, rootType)) collect(name)
  }

  return addableNames.toSorted((first, second): number => first.localeCompare(second))
}

export async function getNonCanvasComponentsFromConfiguration(
  projectName: string,
  configurationPath: string,
  signal?: AbortSignal,
): Promise<NonCanvasComponent[]> {
  return apiFetch<NonCanvasComponent[]>(
    `${getBaseUrl(projectName)}?configurationPath=${encodeURIComponent(configurationPath)}`,
    { signal },
  )
}

export async function addNonCanvasComponent(
  projectName: string,
  configurationPath: string,
  tagName: string,
  attributes: Record<string, string>,
): Promise<NonCanvasComponent[]> {
  return apiFetch<NonCanvasComponent[]>(getBaseUrl(projectName), {
    method: 'POST',
    body: JSON.stringify({ configurationPath, tagName, attributes }),
  })
}

export async function updateNonCanvasComponent(
  projectName: string,
  configurationPath: string,
  tagName: string,
  index: number,
  attributes: Record<string, string>,
): Promise<NonCanvasComponent[]> {
  return apiFetch<NonCanvasComponent[]>(getBaseUrl(projectName), {
    method: 'PUT',
    body: JSON.stringify({ configurationPath, tagName, index, attributes }),
  })
}

export async function deleteNonCanvasComponent(
  projectName: string,
  configurationPath: string,
  tagName: string,
  index: number,
): Promise<NonCanvasComponent[]> {
  const query = `configurationPath=${encodeURIComponent(configurationPath)}&tagName=${encodeURIComponent(tagName)}&index=${index}`
  return apiFetch<NonCanvasComponent[]>(`${getBaseUrl(projectName)}?${query}`, { method: 'DELETE' })
}
