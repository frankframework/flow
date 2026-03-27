import { SAXParser } from 'sax-ts'
import type { FormatDefinition } from '~/types/datamapper_types/data-types'
import type { JsonSchema, SaxAttributes, XsdComplexType, XsdElement } from '~/types/datamapper_types/schema-types'

export type AddNodeFunction = (
  side: 'source' | 'target',
  label: string,
  variableType: string,
  defaultValue?: string | null,
  parentId?: string | null,
  id?: string | null,
  isAttribute?: boolean,
) => Promise<string>

export async function importJsonSchema(
  schema: JsonSchema,
  side: 'source' | 'target',
  parentId: string | null,
  addNode: AddNodeFunction,
  format: FormatDefinition,
) {
  let isRootObject = true

  async function traverseSchema(object: JsonSchema, parentNodeId: string | null, labelPrefix = '') {
    if (!object) return

    let currentNodeId = parentNodeId

    if (object.type === 'object' && object.properties && (!isRootObject || labelPrefix)) {
      currentNodeId = await addNode(side, labelPrefix || 'Object', 'object', object.defaultValue, parentNodeId)
    }

    if (object.type === 'object' && object.properties) {
      for (const [key, value] of Object.entries(object.properties)) {
        await traverseSchema(value, currentNodeId, key)
      }
      return
    }

    if (object.type === 'array' && object.items) {
      await addNode(side, labelPrefix || 'Array', 'array', object.defaultValue, parentNodeId)
      return
    }

    const { name } = resolveType(side, format, object.type)
    await addNode(side, labelPrefix, name, object.defaultValue, currentNodeId)
  }

  await traverseSchema(schema, parentId)
}

export async function importXsdSchema(
  xmlText: string,
  side: 'source' | 'target',
  parentId: string | null,
  addNode: AddNodeFunction,
  format: FormatDefinition,
) {
  const parser = new SAXParser(true, { trim: true, normalize: true })

  const typeMap = new Map<string, XsdComplexType>()
  const complexStack: XsdComplexType[] = []
  const rootElements: XsdElement[] = []

  parser.onopentag = (node: { name: string; attributes: SaxAttributes }) => {
    const { name: tagName, attributes: attrs } = node

    // complexType
    if (tagName.endsWith('complexType')) {
      const typeName = attrs['name'] || ''
      const complexType: XsdComplexType = { '@_name': typeName || undefined, 'xs:sequence': undefined }

      // Attach to current element if unnamed
      const currentElement =
        complexStack.length > 0 ? complexStack.at(-1)!['xs:sequence']?.xs.element?.at(-1) : rootElements.at(-1)

      if (currentElement && !typeName) currentElement['xs:complexType'] = complexType

      complexStack.push(complexType)
    }

    // sequence
    if ((tagName === 'xs:sequence' || tagName === 'xsd:sequence') && complexStack.length > 0) {
      complexStack.at(-1)!['xs:sequence'] = { xs: { element: [] } }
    }

    // element
    if (tagName.endsWith('element')) {
      const element: XsdElement = {
        '@_name': attrs['name'],
        '@_type': attrs['type'],
        '@_maxOccurs': attrs['maxOccurs'],
        '@_minOccurs': attrs['minOccurs'],
        '@_default': attrs['default'],
      }

      if (complexStack.length > 0 && complexStack.at(-1)!['xs:sequence']) {
        complexStack.at(-1)!['xs:sequence']!.xs.element.push(element)
      } else {
        rootElements.push(element)
      }
    }

    // attribute
    if (tagName.endsWith('attribute') && complexStack.length > 0) {
      const currentType = complexStack.at(-1)!
      if (!currentType['xs:attribute']) currentType['xs:attribute'] = []
      currentType['xs:attribute'].push({
        '@_name': attrs['name'],
        '@_type': attrs['type'],
        '@_use': attrs['use'],
      })
    }
  }

  parser.onclosetag = (tagName: string) => {
    if (tagName.endsWith('complexType') && complexStack.length > 0) {
      const completed = complexStack.pop()!
      if (completed['@_name']) typeMap.set(completed['@_name'], completed)
    }
  }

  parser.write(xmlText).close()

  const visitedTypes = new Set<string>()
  for (const rootElement of rootElements) {
    await addElementNode(rootElement, parentId, side, addNode, format, typeMap, visitedTypes)
  }
}

function resolveType(
  side: 'source' | 'target',
  format: FormatDefinition,
  rawType?: string,
): { name: string; basicType: string } {
  if (!format) throw new Error(`No format configuration for side "${side}"`)

  if (!rawType) {
    throw new Error('No default string type configured')
  }

  const normalized = rawType.replace(/^xs:/, '').replace(/^xsd:/, '').toLowerCase()
  const property = format.properties.find((property) => property.name.toLowerCase() === normalized)

  if (!property) throw new Error(`Type "${normalized}" is not configured for format "${format.name}"`)

  return { name: property.name, basicType: property.type }
}

async function addElementNode(
  element: XsdElement,
  parentNodeId: string | null,
  side: 'source' | 'target',
  addNode: AddNodeFunction,
  format: FormatDefinition,
  typeMap: Map<string, XsdComplexType>,
  visitedTypes: Set<string>,
) {
  const name = element['@_name']
  const typeName = element['@_type']
  if (!name) return

  const isArray = element['@_maxOccurs'] && element['@_maxOccurs'] !== '1'
  let nodeId: string

  if (typeName && typeMap.has(typeName)) {
    nodeId = await addNode(side, name, isArray ? 'array' : 'object', undefined, parentNodeId)
    if (!visitedTypes.has(typeName)) {
      visitedTypes.add(typeName)
      await traverseComplexType(typeMap.get(typeName)!, nodeId, side, addNode, format, typeMap, visitedTypes)
    }
  } else if (element['xs:complexType']) {
    nodeId = await addNode(side, name, isArray ? 'array' : 'object', undefined, parentNodeId)
    await traverseComplexType(element['xs:complexType'], nodeId, side, addNode, format, typeMap, visitedTypes)
  } else {
    const prop = resolveType(side, format, typeName)
    nodeId = await addNode(side, name, prop.name, element['@_default'], parentNodeId)
  }

  return nodeId
}

async function traverseComplexType(
  type: XsdComplexType,
  parentNodeId: string,
  side: 'source' | 'target',
  addNode: AddNodeFunction,
  format: FormatDefinition,
  typeMap: Map<string, XsdComplexType>,
  visitedTypes: Set<string>,
) {
  const sequence = type['xs:sequence']
  if (sequence?.xs?.element) {
    const elements: XsdElement[] = Array.isArray(sequence.xs.element) ? sequence.xs.element : [sequence.xs.element]
    for (const elem of elements) {
      await addElementNode(elem, parentNodeId, side, addNode, format, typeMap, visitedTypes)
    }
  }

  if (type['xs:attribute']) {
    for (const attr of type['xs:attribute']) {
      const prop = resolveType(side, format, attr['@_type'])
      await addNode(side, attr['@_name'], prop.name, undefined, parentNodeId, null, true)
    }
  }
}
