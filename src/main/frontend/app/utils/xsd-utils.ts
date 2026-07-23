import { type ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'

export function parseXsd(xsdString: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(xsdString, 'text/xml')
}

export function getChildrenForType(document: Document, typeName: string): string[] {
  const typeNode = getComplexTypeByName(document, typeName)

  if (!typeNode) return []

  return getChildrenFromNode(document, typeNode)
}

function getChildrenFromNode(
  document: Document,
  node: Element,
  visitedGroups = new Set<string>(),
  visitedTypes = new Set<string>(),
): string[] {
  const results: string[] = []

  for (const child of node.children) {
    results.push(...handleNode(document, child, visitedGroups, visitedTypes))
  }

  return results
}

function handleNode(
  document: Document,
  node: Element,
  visitedGroups: Set<string>,
  visitedTypes: Set<string>,
): string[] {
  switch (node.localName) {
    case 'element': {
      return handleElement(document, node, visitedGroups, visitedTypes)
    }

    case 'group': {
      return handleGroup(document, node, visitedGroups, visitedTypes)
    }

    case 'sequence':
    case 'choice':
    case 'all': {
      return handleContainer(document, node, visitedGroups, visitedTypes)
    }

    default: {
      return []
    }
  }
}

function handleElement(
  document: Document,
  node: Element,
  visitedGroups: Set<string>,
  visitedTypes: Set<string>,
): string[] {
  const results: string[] = []

  const name = node.getAttribute('name') || node.getAttribute('ref')
  if (name) results.push(name)

  const baseType = getBaseTypeFromElement(node)

  if (baseType && !visitedTypes.has(baseType)) {
    visitedTypes.add(baseType)

    const typeNode = getComplexTypeByName(document, baseType)
    if (typeNode) {
      results.push(...getChildrenFromNode(document, typeNode, visitedGroups, visitedTypes))
    }
  }

  return results
}

function handleGroup(
  document: Document,
  node: Element,
  visitedGroups: Set<string>,
  visitedTypes: Set<string>,
): string[] {
  const reference = node.getAttribute('ref')
  if (!reference || visitedGroups.has(reference)) return []

  visitedGroups.add(reference)

  const groupDefinition = getGroupByName(document, reference)
  if (!groupDefinition) return []

  return getChildrenFromNode(document, groupDefinition, visitedGroups, visitedTypes)
}

function handleContainer(
  document: Document,
  node: Element,
  visitedGroups: Set<string>,
  visitedTypes: Set<string>,
): string[] {
  const results: string[] = []

  for (const child of node.children) {
    results.push(...handleNode(document, child, visitedGroups, visitedTypes))
  }

  return results
}

function getComplexTypeByName(document: Document, typeName: string): Element | null {
  return queryOne(document, `//xs:complexType[@name='${typeName}']`)
}

function getGroupByName(document: Document, name: string): Element | null {
  return queryOne(document, `//xs:group[@name='${name}']`)
}

function getBaseTypeFromElement(element: Element): string | null {
  const extension = queryOne(element, `.//xs:extension`)
  return extension?.getAttribute('base') || null
}

const nsResolver = (prefix: string | null): 'http://www.w3.org/2001/XMLSchema' | null =>
  prefix === 'xs' ? 'http://www.w3.org/2001/XMLSchema' : null

function queryOne(context: Document | Element, xpath: string): Element | null {
  const result = evaluateXPath(context, xpath)
  return result.singleNodeValue as Element | null
}

function evaluateXPath(
  context: Document | Element,
  xpath: string,
  type: number = XPathResult.FIRST_ORDERED_NODE_TYPE,
): XPathResult {
  const document = context.ownerDocument ?? context

  return document.evaluate(xpath, context, nsResolver, type, null)
}

export function resolveElementTypeName(document: Document, elementName: string): string | null {
  const elementNode = queryOne(document, `//xs:element[@name='${elementName}']`)
  if (!elementNode) return null

  return elementNode.getAttribute('type') ?? getBaseTypeFromElement(elementNode) ?? `${elementName}Type`
}

export function getAllowedChildElementsForElement(document: Document, elementName: string): string[] {
  const typeName = resolveElementTypeName(document, elementName)
  if (!typeName) return []

  return getFirstLevelElementsForType(document, typeName)
}

export function getFirstLevelElementsForType(document: Document, typeName: string): string[] {
  const typeNode = getComplexTypeByName(document, typeName)
  if (!typeNode) return []

  const results = new Set<string>()

  const extract = (node: Element, visitedGroups = new Set<string>()): void => {
    for (const child of node.children) {
      const tag = child.localName

      switch (tag) {
        case 'element': {
          const name = child.getAttribute('name') || child.getAttribute('ref')
          if (name) results.add(name)

          break
        }

        case 'group': {
          const reference = child.getAttribute('ref')
          if (!reference || visitedGroups.has(reference)) break

          visitedGroups.add(reference)

          const groupDefinition = getGroupByName(document, reference)
          if (!groupDefinition) break

          extract(groupDefinition, visitedGroups)

          break
        }

        case 'sequence':
        case 'choice':
        case 'all': {
          extract(child, visitedGroups)
          break
        }
      }
    }
  }

  extract(typeNode)

  return [...results]
}

export function getElementRequirements(document: Document, elementName: string): Requirement[] {
  const typeName = resolveElementTypeName(document, elementName)
  if (!typeName) return []

  const typeNode = getComplexTypeByName(document, typeName)
  if (!typeNode) {
    console.warn(`No type found for element "${elementName}" (tried "${typeName}")`)
    return []
  }

  return extractRequirements(document, typeNode)
}

function extractRequirements(
  document: Document,
  node: Element,
  parentRequired = true,
  visitedGroups = new Set<string>(),
): Requirement[] {
  const results: Requirement[] = []

  for (const child of node.children) {
    const minOccurs = child.getAttribute('minOccurs')
    const isRequired = parentRequired && (minOccurs === null || minOccurs !== '0')

    switch (child.localName) {
      case 'element': {
        const name = child.getAttribute('name') || child.getAttribute('ref')
        if (name) {
          results.push({
            kind: 'element',
            name,
            required: isRequired,
          })
        }
        break
      }

      case 'group': {
        const reference = child.getAttribute('ref')
        if (!reference || visitedGroups.has(reference)) break

        visitedGroups.add(reference)

        const groupDefinition = getGroupByName(document, reference)
        if (!groupDefinition) break

        const children = extractRequirements(document, groupDefinition, isRequired, visitedGroups)

        if (isRequired) {
          // REQUIRED GROUP = "at least one of its children"
          results.push({
            kind: 'group',
            mode: 'one',
            children,
          })
        } else {
          // optional group -> children optional
          results.push(
            ...children.map((c): GroupRequirement | { required: boolean; kind: 'element'; name: string } =>
              c.kind === 'element' ? { ...c, required: false } : c,
            ),
          )
        }

        break
      }

      case 'sequence':
      case 'all': {
        const children = extractRequirements(document, child, isRequired, visitedGroups)

        results.push({
          kind: 'group',
          mode: 'all',
          children,
        })

        break
      }

      case 'choice': {
        const children = extractRequirements(document, child, isRequired, visitedGroups)

        results.push({
          kind: 'group',
          mode: 'one',
          children,
        })

        break
      }
    }
  }

  return results
}

export function isRequirementFulfilled(requirements: Requirement[], children: ChildNode[]): boolean {
  return requirements.every((requirement): boolean => evaluateRequirement(requirement, children))
}

function evaluateRequirement(requirement: Requirement, children: ChildNode[]): boolean {
  if (requirement.kind === 'element') {
    if (!requirement.required) return true

    return children.some((child): boolean => child.subtype === requirement.name)
  }

  if (requirement.kind === 'group') {
    if (requirement.mode === 'all') {
      return requirement.children.every((childRequest): boolean => evaluateRequirement(childRequest, children))
    }

    if (requirement.mode === 'one') {
      return requirement.children.some((childRequest): boolean => evaluateRequirement(childRequest, children))
    }
  }

  return true
}

export function getMissingRequirements(requirements: Requirement[], children: ChildNode[]): string[] {
  const missing: string[] = []

  for (const request of requirements) {
    collectMissing(request, children, missing)
  }

  return missing
}

function collectMissing(requirement: Requirement, children: ChildNode[], missing: string[]): void {
  if (requirement.kind === 'element') {
    if (!requirement.required) return

    const exists = children.some((child): boolean => child.subtype === requirement.name)

    if (!exists) {
      missing.push(requirement.name)
    }

    return
  }

  if (requirement.kind === 'group') {
    if (requirement.mode === 'all') {
      for (const childRequirement of requirement.children) collectMissing(childRequirement, children, missing)
    } else if (requirement.mode === 'one') {
      const anySatisfied = requirement.children.some((childRequirement): boolean =>
        evaluateRequirement(childRequirement, children),
      )

      if (!anySatisfied) {
        const requiredChildren = requirement.children
          .map((element): Requirement | null => getRequiredOnly(element))
          .filter(Boolean) as Requirement[]

        if (requiredChildren.length === 0) return

        const options = requiredChildren.flatMap((element): string[] => getReadableNames(element)).join(', ')

        missing.push(`One of: ${options}`)
      }
    }
  }
}

function getReadableNames(requirement: Requirement): string[] {
  if (requirement.kind === 'element') {
    return [requirement.name]
  }

  if (requirement.kind === 'group') {
    return requirement.children.flatMap((element): string[] => getReadableNames(element))
  }

  return []
}

function getRequiredOnly(requirement: Requirement): Requirement | null {
  if (requirement.kind === 'element') {
    return requirement.required ? requirement : null
  }

  if (requirement.kind === 'group') {
    const filteredChildren = requirement.children
      .map((element): Requirement | null => getRequiredOnly(element))
      .filter(Boolean) as Requirement[]

    if (filteredChildren.length === 0) return null

    return {
      ...requirement,
      children: filteredChildren,
    }
  }

  return null
}

type RequirementBase = {
  kind: 'element' | 'group'
}

type ElementRequirement = {
  kind: 'element'
  name: string
  required: boolean
} & RequirementBase

export type Requirement = ElementRequirement | GroupRequirement

type GroupRequirement = {
  kind: 'group'
  mode: 'all' | 'one'
  children: Requirement[]
} & RequirementBase
