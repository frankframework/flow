export function parseXsd(xsdString: string) {
  const parser = new DOMParser()
  return parser.parseFromString(xsdString, 'text/xml')
}

export function getChildrenForType(doc: Document, typeName: string): string[] {
  const typeNode = getComplexTypeByName(doc, typeName)

  if (!typeNode) return []

  return getChildrenFromNode(doc, typeNode)
}

function getChildrenFromNode(doc: Document, node: Element, visitedGroups = new Set<string>()): string[] {
  const results: string[] = []

  for (const child of node.children) {
    const tag = child.localName

    switch (tag) {
      case 'element': {
        const name = child.getAttribute('name') || child.getAttribute('ref')
        if (name) results.push(name)

        break
      }
      case 'group': {
        const ref = child.getAttribute('ref')
        if (ref && !visitedGroups.has(ref)) {
          visitedGroups.add(ref)

          const groupDef = getGroupByName(doc, ref)
          if (groupDef) {
            results.push(...getChildrenFromNode(doc, groupDef, visitedGroups))
          }
        }

        break
      }
      case 'sequence':
      case 'choice':
      case 'all': {
        results.push(...getChildrenFromNode(doc, child, visitedGroups))

        break
      }
    }
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
