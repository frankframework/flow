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

  const baseType = getBaseTypeFromElement(doc, node)

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
  const result = doc.evaluate(
    `//xs:complexType[@name='${typeName}']`,
    doc,
    (prefix) => (prefix === 'xs' ? 'http://www.w3.org/2001/XMLSchema' : null),
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )

  return result.singleNodeValue as Element | null
}

function getGroupByName(doc: Document, name: string): Element | null {
  const result = doc.evaluate(
    `//xs:group[@name='${name}']`,
    doc,
    (prefix) => (prefix === 'xs' ? 'http://www.w3.org/2001/XMLSchema' : null),
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )

  return result.singleNodeValue as Element | null
}

function getBaseTypeFromElement(doc: Document, element: Element): string | null {
  const result = doc.evaluate(
    `.//xs:extension`,
    element,
    (prefix) => (prefix === 'xs' ? 'http://www.w3.org/2001/XMLSchema' : null),
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )

  const ext = result.singleNodeValue as Element | null
  return ext?.getAttribute('base') || null
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
