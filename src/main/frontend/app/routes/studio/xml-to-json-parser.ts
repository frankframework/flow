import type { FlowNode } from '~/routes/studio/canvas/flow'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import type { ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import type { FrankNode } from '~/routes/studio/canvas/nodetypes/frank-node'
import { SAXParser } from 'sax-ts'

interface IdCounter {
  current: number
}

export async function getXmlString(projectName: string, filename: string): Promise<string> {
  try {
    const response = await fetch(`/projects/${projectName}/${filename}`)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()
    return data.xmlContent
  } catch (error) {
    throw new Error(`Failed to fetch XML file for ${projectName}/${filename}: ${error}`)
  }
}

export async function getAdapterNamesFromConfiguration(projectName: string, filename: string): Promise<string[]> {
  const xmlString = await getXmlString(projectName, filename)

  return new Promise((resolve, reject) => {
    const adapterNames: string[] = []
    const parser = new SAXParser(true, {}) // strict mode

    parser.onopentag = (node) => {
      if (node.name === 'Adapter' && typeof node.attributes.name === 'string') {
        adapterNames.push(node.attributes.name)
      }
    }

    parser.onerror = (error) => {
      reject(new Error(`SAX parsing error: ${error.message}`))
    }

    parser.onend = () => {
      resolve(adapterNames)
    }

    try {
      parser.write(xmlString).close()
    } catch (error) {
      reject(new Error(`Failed to parse XML: ${(error as Error).message}`))
    }
  })
}

export async function getAdapterFromConfiguration(
  projectname: string,
  filename: string,
  adapterName: string,
): Promise<Element | null> {
  const xmlString = await getXmlString(projectname, filename)
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

  const adapterList = xmlDoc.querySelectorAll('Adapter')
  for (const adapter of adapterList) {
    if (adapter.getAttribute('name') === adapterName) {
      return adapter
    }
  }

  return null
}

export async function getAdapterListenerType(
  projectName: string,
  filename: string,
  adapterName: string,
): Promise<string | null> {
  const adapterElement = await getAdapterFromConfiguration(projectName, filename, adapterName)
  if (!adapterElement) return null
  // Look through all child elements inside the adapter
  const children = adapterElement.querySelectorAll('*')
  for (const child of children) {
    if (child.tagName.includes('Listener')) {
      return child.tagName // Return the tag name, e.g., "JavaListener"
    }
  }

  // No listener element found
  return null
}

export async function convertAdapterXmlToJson(adapter: Element) {
  const nodes = convertAdapterToFlowNodes(adapter)
  const adapterJson = { nodes: nodes, edges: extractEdgesFromAdapter(adapter, nodes) }

  return adapterJson
}

function extractEdgesFromAdapter(adapter: Element, nodes: FlowNode[]): FrankEdge[] {
  const pipelineElement = adapter.querySelector('Pipeline')
  if (!pipelineElement) return []

  const nameToId = mapNodeNamesToIds(nodes)
  const pipelineChildren = [...pipelineElement.children]

  const forwardIndexBySourceId = new Map<string, number>()

  // 1. Explicit forwards (fills forwardIndexBySourceId)
  const forwardEdges = extractForwardEdges(pipelineChildren, nameToId, forwardIndexBySourceId)

  // 2. Fallback sequential edges (uses forwardIndexBySourceId)
  const fallbackEdges = extractFallbackEdges(nodes, forwardIndexBySourceId)

  return [...forwardEdges, ...fallbackEdges]
}

function mapNodeNamesToIds(nodes: FlowNode[]): Map<string, string> {
  const map = new Map<string, string>()

  for (const node of nodes) {
    if ('name' in node.data && typeof node.data.name === 'string') {
      map.set(node.data.name, node.id)
    }
  }

  return map
}

function extractForwardEdges(
  pipelineChildren: Element[],
  nameToId: Map<string, string>,
  forwardIndexBySourceId: Map<string, number>,
): FrankEdge[] {
  const edges: FrankEdge[] = []

  for (const element of pipelineChildren) {
    const sourceName = element.getAttribute('name')
    if (!sourceName) continue

    const sourceId = nameToId.get(sourceName)
    if (!sourceId) continue

    const forwards = element.querySelectorAll('Forward')

    for (const forward of forwards) {
      const targetName = forward.getAttribute('path')
      if (!targetName) continue

      const targetId = nameToId.get(targetName)
      if (!targetId) {
        console.warn(`Target node "${targetName}" not found.`)
        continue
      }

      const handleIndex = forwardIndexBySourceId.get(sourceId) ?? 1
      forwardIndexBySourceId.set(sourceId, handleIndex + 1)

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'frankEdge',
        sourceHandle: handleIndex.toString(),
      })
    }
  }

  return edges
}

function extractFallbackEdges(nodes: FlowNode[], forwardIndexBySourceId: Map<string, number>): FrankEdge[] {
  const edges: FrankEdge[] = []

  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i]
    const next = nodes[i + 1]

    if (current.type === 'exitNode') continue
    if (next.type === 'exitNode') continue

    const nextHandleIndex = forwardIndexBySourceId.get(current.id) ?? 1

    // update next index for future edges
    forwardIndexBySourceId.set(current.id, nextHandleIndex + 1)

    edges.push({
      id: `${current.id}-${next.id}`,
      source: current.id,
      target: next.id,
      type: 'frankEdge',
      sourceHandle: nextHandleIndex.toString(),
    })
  }

  return edges
}

function convertAdapterToFlowNodes(adapter: any): FlowNode[] {
  let elements: Element[] = []
  let nodes: FlowNode[] = []
  let exitNodes: ExitNode[] = []
  const idCounter: IdCounter = { current: 0 }

  const receiverElements = adapter.querySelectorAll('Adapter > Receiver')
  for (const receiver of receiverElements) elements.push(receiver)

  const pipelineElement = adapter.querySelector('Pipeline')
  let firstPipeName = null
  if (pipelineElement) {
    firstPipeName = pipelineElement.getAttribute('firstPipe')
    let pipeArray = [...pipelineElement.children]

    if (firstPipeName) {
      pipeArray = movePipeToFront(pipeArray, firstPipeName)
    }

    elements.push(...pipeArray)
  }

  for (const element of elements) {
    if (element.tagName === 'Exits') {
      const exits = [...element.children]
      for (const exit of exits) {
        const exitNode: ExitNode = {
          id: '', // IDs get assigned after collecting all nodes
          type: 'exitNode',
          position: { x: 0, y: 0 },
          data: {
            name: exit.getAttribute('name') || '',
            type: 'Exit',
            subtype: 'Exit',
          },
        }
        exitNodes.push(exitNode)
      }
      continue
    }

    // Extract source handles from <Forward> children
    // Extract all forward elements
    const forwardElements = [...element.querySelectorAll('Forward')]

    // First build handles for explicit forwards
    let sourceHandles = forwardElements.map((forward, index) => {
      const path = forward.getAttribute('path') || ''
      const loweredPath = path.toLowerCase()

      const type =
        loweredPath.includes('error') || loweredPath.includes('bad') || loweredPath.includes('fail')
          ? 'failure'
          : 'success'

      return {
        type,
        index: index + 1,
      }
    })

    // Always add 1 fallback handle after all forward handles
    sourceHandles.push({
      type: 'success',
      index: sourceHandles.length + 1,
    })

    const frankNode: FrankNode = convertElementToNode(element, idCounter, sourceHandles)
    nodes.push(frankNode)
  }

  // Now assign IDs to exitNodes starting from current id
  for (const exitNode of exitNodes) {
    exitNode.id = idCounter.current.toString()
    nodes.push(exitNode)
    idCounter.current++
  }

  return nodes
}

function movePipeToFront(pipeArray: Element[], firstPipeName: string): Element[] {
  const index = pipeArray.findIndex((pipe) => pipe.getAttribute('name') === firstPipeName)
  if (index === -1) return pipeArray

  const updated = [...pipeArray]
  const [firstPipe] = updated.splice(index, 1)
  updated.unshift(firstPipe)

  return updated
}

function convertElementToNode(element: Element, idCounter: IdCounter, sourceHandles: any): FrankNode {
  const thisId = (idCounter.current++).toString()
  // Extract attributes for this element except "name"
  const attributes: Record<string, string> = {}
  for (const attribute of element.attributes) {
    if (attribute.name !== 'name') {
      attributes[attribute.name] = attribute.value
    }
  }

  const frankNode: FrankNode = {
    id: thisId,
    type: 'frankNode',
    position: { x: 0, y: 0 },
    data: {
      name: element.getAttribute('name') || '',
      type: getElementTypeFromName(element.tagName),
      subtype: element.tagName,
      children: convertChildren([...element.children], idCounter),
      sourceHandles,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    },
  }

  return frankNode
}

function convertChildren(elements: Element[], idCounter: IdCounter): any[] {
  return elements
    .filter((child) => child.tagName !== 'Forward') // skip 'Forward' elements
    .map((child) => {
      // Extract child's attributes except 'name'
      const childAttributes: Record<string, string> = {}
      const childId = (idCounter.current++).toString()
      for (const attribute of child.attributes) {
        if (attribute.name !== 'name') {
          childAttributes[attribute.name] = attribute.value
        }
      }

      return {
        id: childId,
        name: child.getAttribute('name'),
        subtype: child.tagName,
        type: getElementTypeFromName(child.tagName),
        attributes: Object.keys(childAttributes).length > 0 ? childAttributes : undefined,
        children: convertChildren([...child.children], idCounter),
      }
    })
}

interface FrankEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  type: 'frankEdge'
}
