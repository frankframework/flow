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
