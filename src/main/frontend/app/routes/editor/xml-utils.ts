interface AdapterLocation {
  name: string
  offset: number
}

export function findAdaptersInXml(xml: string): AdapterLocation[] {
  const adapters: AdapterLocation[] = []
  const regex = /<Adapter\b[^>]*\bname\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    adapters.push({ name: match[1], offset: match.index })
  }
  return adapters
}

export function lineToOffset(xml: string, lineNumber: number): number {
  const lines = xml.split('\n')
  let offset = 0
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1
  }
  return offset
}

export function findAdapterAtOffset(adapters: AdapterLocation[], cursorOffset: number): string {
  for (let i = adapters.length - 1; i >= 0; i--) {
    if (adapters[i].offset <= cursorOffset) return adapters[i].name
  }
  return adapters[0].name
}

/**  Converts the tagname of a non capitalized element that has a classname attribute to the last part of said classname, e.g.:
 * <pipe name="uploadFiles" className="org.frankframework.pipes.ForEachChildElementPipe" />
 * Becomes <ForEachChildElementPipe name="uploadFiles" />
 *
 * Also updates all other elements to be capitalized, e.g.:
 * <param /> becomes <Param />
 */
export function normalizeFrankElements(xml: string): string {
  const parser = new DOMParser()
  const serializer = new XMLSerializer()

  const doc = parser.parseFromString(xml, 'application/xml')

  // Get all elements
  const elements = [...doc.querySelectorAll('*')]

  for (const element of elements) {
    const originalTag = element.tagName
    const className = element.getAttribute('className')

    const isLowerCase = originalTag === originalTag.toLowerCase()

    let newTagName: string | null = null

    if (isLowerCase && className) {
      // Use last part of className
      const parts = className.split('.')
      newTagName = parts.at(-1)!.trim()
      element.removeAttribute('className')
    } else if (isLowerCase) {
      // Just capitalize
      newTagName = originalTag.charAt(0).toUpperCase() + originalTag.slice(1)
    }

    if (newTagName && newTagName !== originalTag) {
      renameElement(element, newTagName, doc)
    }
  }

  return serializer.serializeToString(doc)
}

function renameElement(element: Element, newTagName: string, doc: Document) {
  const newElement = doc.createElement(newTagName)

  // Copy attributes
  for (const attr of element.attributes) {
    newElement.setAttribute(attr.name, attr.value)
  }

  // Move children
  while (element.firstChild) {
    newElement.append(element.firstChild)
  }

  element.parentNode?.replaceChild(newElement, element)
}
