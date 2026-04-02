import { type ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'

export function parseXsd(xsdString: string) {
  const parser = new DOMParser()
  return parser.parseFromString(xsdString, 'text/xml')
}

export function getChildrenForType(doc: Document, typeName: string): string[] {
  const typeNode = getComplexTypeByName(doc, typeName)

  if (!typeNode) return []

  return getChildrenFromNode(doc, typeNode)
}

function getChildrenFromNode(
  doc: Document,
  node: Element,
  visitedGroups = new Set<string>(),
  visitedTypes = new Set<string>(),
): string[] {
  const results: string[] = []

  for (const child of node.children) {
    results.push(...handleNode(doc, child, visitedGroups, visitedTypes))
  }

  return results
}

function handleNode(doc: Document, node: Element, visitedGroups: Set<string>, visitedTypes: Set<string>): string[] {
  switch (node.localName) {
    case 'element': {
      return handleElement(doc, node, visitedGroups, visitedTypes)
    }

    case 'group': {
      return handleGroup(doc, node, visitedGroups, visitedTypes)
    }

    case 'sequence':
    case 'choice':
    case 'all': {
      return handleContainer(doc, node, visitedGroups, visitedTypes)
    }

    default: {
      return []
    }
  }
}

function handleElement(doc: Document, node: Element, visitedGroups: Set<string>, visitedTypes: Set<string>): string[] {
  const results: string[] = []

  const name = node.getAttribute('name') || node.getAttribute('ref')
  if (name) results.push(name)

  const baseType = getBaseTypeFromElement(node)

  if (baseType && !visitedTypes.has(baseType)) {
    visitedTypes.add(baseType)

    const typeNode = getComplexTypeByName(doc, baseType)
    if (typeNode) {
      results.push(...getChildrenFromNode(doc, typeNode, visitedGroups, visitedTypes))
    }
  }

  return results
}

function handleGroup(doc: Document, node: Element, visitedGroups: Set<string>, visitedTypes: Set<string>): string[] {
  const ref = node.getAttribute('ref')
  if (!ref || visitedGroups.has(ref)) return []

  visitedGroups.add(ref)

  const groupDef = getGroupByName(doc, ref)
  if (!groupDef) return []

  return getChildrenFromNode(doc, groupDef, visitedGroups, visitedTypes)
}

function handleContainer(
  doc: Document,
  node: Element,
  visitedGroups: Set<string>,
  visitedTypes: Set<string>,
): string[] {
  const results: string[] = []

  for (const child of node.children) {
    results.push(...handleNode(doc, child, visitedGroups, visitedTypes))
  }

  return results
}

function getComplexTypeByName(doc: Document, typeName: string): Element | null {
  return queryOne(doc, `//xs:complexType[@name='${typeName}']`)
}

function getGroupByName(doc: Document, name: string): Element | null {
  return queryOne(doc, `//xs:group[@name='${name}']`)
}

function getBaseTypeFromElement(element: Element): string | null {
  const ext = queryOne(element, `.//xs:extension`)
  return ext?.getAttribute('base') || null
}

const nsResolver = (prefix: string | null) => (prefix === 'xs' ? 'http://www.w3.org/2001/XMLSchema' : null)

function queryOne(context: Document | Element, xpath: string): Element | null {
  const result = evaluateXPath(context, xpath)
  return result.singleNodeValue as Element | null
}

function evaluateXPath(
  context: Document | Element,
  xpath: string,
  type: number = XPathResult.FIRST_ORDERED_NODE_TYPE,
): XPathResult {
  const doc = context.ownerDocument ?? context

  return doc.evaluate(xpath, context, nsResolver, type, null)
}

export function getFirstLevelElementsForType(doc: Document, typeName: string): string[] {
  const typeNode = getComplexTypeByName(doc, typeName)
  if (!typeNode) return []

  const results = new Set<string>()

  const extract = (node: Element, visitedGroups = new Set<string>()) => {
    for (const child of node.children) {
      const tag = child.localName

      switch (tag) {
        case 'element': {
          const name = child.getAttribute('name') || child.getAttribute('ref')
          if (name) results.add(name)

          break
        }

        case 'group': {
          const ref = child.getAttribute('ref')
          if (!ref || visitedGroups.has(ref)) break

          visitedGroups.add(ref)

          const groupDef = getGroupByName(doc, ref)
          if (!groupDef) break

          extract(groupDef, visitedGroups)

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

export function getElementRequirements(doc: Document, elementName: string): Requirement[] {
  const elementNode = doc.evaluate(
    `//xs:element[@name='${elementName}']`,
    doc,
    (prefix) => (prefix === 'xs' ? 'http://www.w3.org/2001/XMLSchema' : null),
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as Element | null

  if (!elementNode) return []

  let typeName = elementNode.getAttribute('type')

  if (!typeName) {
    typeName = `${elementName}Type`
  }

  const typeNode = getComplexTypeByName(doc, typeName)
  if (!typeNode) {
    console.warn(`No type found for element "${elementName}" (tried "${typeName}")`)
    return []
  }

  return extractRequirements(doc, typeNode)
}

function extractRequirements(
  doc: Document,
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
        const ref = child.getAttribute('ref')
        if (!ref || visitedGroups.has(ref)) break

        visitedGroups.add(ref)

        const groupDef = getGroupByName(doc, ref)
        if (!groupDef) break

        const children = extractRequirements(doc, groupDef, isRequired, visitedGroups)

        if (isRequired) {
          // REQUIRED GROUP = "at least one of its children"
          results.push({
            kind: 'group',
            mode: 'one',
            children,
          })
        } else {
          // optional group -> children optional
          results.push(...children.map((c) => (c.kind === 'element' ? { ...c, required: false } : c)))
        }

        break
      }

      case 'sequence':
      case 'all': {
        const children = extractRequirements(doc, child, isRequired, visitedGroups)

        results.push({
          kind: 'group',
          mode: 'all',
          children,
        })

        break
      }

      case 'choice': {
        const children = extractRequirements(doc, child, isRequired, visitedGroups)

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
  return requirements.every((requirement) => evaluateRequirement(requirement, children))
}

function evaluateRequirement(requirement: Requirement, children: ChildNode[]): boolean {
  if (requirement.kind === 'element') {
    if (!requirement.required) return true

    return children.some((child) => child.subtype === requirement.name)
  }

  if (requirement.kind === 'group') {
    if (requirement.mode === 'all') {
      return requirement.children.every((childReq) => evaluateRequirement(childReq, children))
    }

    if (requirement.mode === 'one') {
      return requirement.children.some((childReq) => evaluateRequirement(childReq, children))
    }
  }

  return true
}

export function getMissingRequirements(requirements: Requirement[], children: ChildNode[]): string[] {
  const missing: string[] = []

  for (const req of requirements) {
    collectMissing(req, children, missing)
  }

  return missing
}

function collectMissing(req: Requirement, children: ChildNode[], missing: string[]) {
  if (req.kind === 'element') {
    if (!req.required) return

    const exists = children.some((child) => child.subtype === req.name)

    if (!exists) {
      missing.push(req.name)
    }

    return
  }

  if (req.kind === 'group') {
    if (req.mode === 'all') {
      for (const childReq of req.children) collectMissing(childReq, children, missing)
    }

    if (req.mode === 'one') {
      const anySatisfied = req.children.some((childReq) => evaluateRequirement(childReq, children))

      if (!anySatisfied) {
        const options = req.children.flatMap((element) => getReadableNames(element)).join(', ')

        missing.push(`One of: ${options}`)
      }
    }
  }
}

function getReadableNames(req: Requirement): string[] {
  if (req.kind === 'element') {
    return [req.name]
  }

  if (req.kind === 'group') {
    return req.children.flatMap((element) => getReadableNames(element))
  }

  return []
}

interface RequirementBase {
  kind: 'element' | 'group'
}

interface ElementRequirement extends RequirementBase {
  kind: 'element'
  name: string
  required: boolean
}

export type Requirement = ElementRequirement | GroupRequirement

interface GroupRequirement extends RequirementBase {
  kind: 'group'
  mode: 'all' | 'one'
  children: Requirement[]
}
