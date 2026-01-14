import type { FlowNode } from '~/routes/studio/canvas/flow'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import type { ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import type { FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import { SAXParser } from 'sax-ts'
import type { ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'

interface IdCounter {
  current: number
}

interface SourceHandle {
  type: string
  index: number
}

export async function getXmlString(projectName: string, filepath: string): Promise<string> {
  try {
    const response = await fetch(`/api/projects/${projectName}/configuration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filepath }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()
    return data.content
  } catch (error) {
    throw new Error(`Failed to fetch XML file for ${filepath}: ${error}`)
  }
}

export async function getAdapterNamesFromConfiguration(projectName: string, filepath: string): Promise<string[]> {
  const xmlString = await getXmlString(projectName, filepath)

  return new Promise((resolve, reject) => {
    const adapterNames: string[] = []
    const parser = new SAXParser(true, {}) // strict mode

    parser.onopentag = (node: { name: string; attributes: Record<string, unknown> }) => {
      if (node.name === 'Adapter' && typeof node.attributes.name === 'string') {
        adapterNames.push(node.attributes.name)
      }
    }

    // eslint-disable-next-line unicorn/prefer-add-event-listener
    parser.onerror = (error: Error) => {
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

function buildNodeNameToIdMap(nodes: FlowNode[]): Map<string, string> {
  const nameToId = new Map<string, string>()
  for (const node of nodes) {
    if ('name' in node.data && typeof node.data.name === 'string') {
      nameToId.set(node.data.name, node.id)
    }
  }
  return nameToId
}

function extractEdgesFromAdapter(adapter: Element, nodes: FlowNode[]): FrankEdge[] {
  const pipelineElement = adapter.querySelector('Pipeline')
  if (!pipelineElement) return []

  const edges: FrankEdge[] = []
  const nameToId = buildNodeNameToIdMap(nodes)
  const forwardIndexBySourceId = new Map<string, number>()
  const explicitTargetsBySourceId = new Map<string, Set<string>>()

  addExplicitForwardEdges(pipelineElement, nameToId, edges, forwardIndexBySourceId, explicitTargetsBySourceId)

  addSequentialFallbackEdges(nodes, edges, forwardIndexBySourceId, explicitTargetsBySourceId)

  addImplicitSuccessExitEdge(nodes, edges, forwardIndexBySourceId)

  return edges
}

function addExplicitForwardEdges(
  pipelineElement: Element,
  nameToId: Map<string, string>,
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
  explicitTargetsBySourceId: Map<string, Set<string>>,
) {
  const pipelineChildren = [...pipelineElement.children]

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
      if (!targetId) continue

      const handleIndex = forwardIndexBySourceId.get(sourceId) ?? 1
      forwardIndexBySourceId.set(sourceId, handleIndex + 1)

      edges.push({
        id: `${sourceId}-${targetId}-${handleIndex}`,
        source: sourceId,
        target: targetId,
        type: 'frankEdge',
        sourceHandle: handleIndex.toString(),
      })

      if (!explicitTargetsBySourceId.has(sourceId)) {
        explicitTargetsBySourceId.set(sourceId, new Set())
      }
      explicitTargetsBySourceId.get(sourceId)!.add(targetId)
    }
  }
}

function addSequentialFallbackEdges(
  nodes: FlowNode[],
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
  explicitTargetsBySourceId: Map<string, Set<string>>,
) {
  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i]
    const next = nodes[i + 1]

    if (current.type === 'exitNode') continue
    if (next.type === 'exitNode') continue

    const explicitTargets = explicitTargetsBySourceId.get(current.id)

    // Only skip if the NEXT node is already an explicit target
    if (explicitTargets?.has(next.id)) {
      continue
    }

    const handleIndex = forwardIndexBySourceId.get(current.id) ?? 1
    forwardIndexBySourceId.set(current.id, handleIndex + 1)

    edges.push({
      id: `${current.id}-${next.id}-${handleIndex}`,
      source: current.id,
      target: next.id,
      type: 'frankEdge',
      sourceHandle: handleIndex.toString(),
    })
  }
}

function addImplicitSuccessExitEdge(
  nodes: FlowNode[],
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
) {
  const successExit = findSuccessExit(nodes)
  if (!successExit) return

  // Already explicitly targeted: do nothing
  if (isNodeTargeted(successExit.id, edges)) return

  // Find last non-exit node
  const lastPipelineNode = nodes.toReversed().find((node) => node.type !== 'exitNode')

  if (!lastPipelineNode) return

  const handleIndex = forwardIndexBySourceId.get(lastPipelineNode.id) ?? 1
  forwardIndexBySourceId.set(lastPipelineNode.id, handleIndex + 1)

  edges.push({
    id: `${lastPipelineNode.id}-${successExit.id}-${handleIndex}`,
    source: lastPipelineNode.id,
    target: successExit.id,
    type: 'frankEdge',
    sourceHandle: handleIndex.toString(),
  })
}

function collectPipelineElements(adapter: Element): Element[] {
  const elements: Element[] = []
  const receiverElements = adapter.querySelectorAll('Adapter > Receiver')
  for (const receiver of receiverElements) elements.push(receiver)

  const pipelineElement = adapter.querySelector('Pipeline')
  if (!pipelineElement) return elements

  const firstPipeName = pipelineElement.getAttribute('firstPipe')
  let pipeArray = [...pipelineElement.children]

  if (firstPipeName) {
    const firstPipeIndex = pipeArray.findIndex((pipe) => pipe.getAttribute('name') === firstPipeName)
    if (firstPipeIndex !== -1) {
      const [firstPipe] = pipeArray.splice(firstPipeIndex, 1)
      pipeArray.unshift(firstPipe)
    }
  }

  elements.push(...pipeArray)
  return elements
}

function extractSourceHandles(element: Element): SourceHandle[] {
  const forwardElements = [...element.querySelectorAll('Forward')]

  // No forwards? Generate a single implicit success/fallback handle
  if (forwardElements.length === 0) {
    return [{ type: 'success', index: 1 }]
  }

  return forwardElements.map((forward, index) => {
    const name = forward.getAttribute('name')?.trim()

    return {
      type: name && name.length > 0 ? name : 'success',
      index: index + 1,
    }
  })
}

function processExitElements(element: Element, exitNodes: ExitNode[]) {
  const exits = [...element.children]
  for (const exit of exits) {
    const attributes: Record<string, string> = {}
    for (const attr of exit.attributes) {
      attributes[attr.name] = attr.value
    }

    const exitNode: ExitNode = {
      id: '',
      type: 'exitNode',
      position: { x: 0, y: 0 },
      data: {
        name: exit.getAttribute('name') || '',
        type: 'Exit',
        subtype: 'Exit',
        attributes,
      },
    }
    exitNodes.push(exitNode)
  }
}

function convertAdapterToFlowNodes(adapter: Element): FlowNode[] {
  const nodes: FlowNode[] = []
  const exitNodes: ExitNode[] = []
  const idCounter: IdCounter = { current: 0 }
  const elements = collectPipelineElements(adapter)

  for (const element of elements) {
    if (element.tagName === 'Exits') {
      processExitElements(element, exitNodes)
      continue
    }
    if (element.tagName.toLowerCase() === 'exit') {
      const attributes: Record<string, string> = {}
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value
      }
      const exitNode: ExitNode = {
        id: '',
        type: 'exitNode',
        position: { x: 0, y: 0 },
        data: {
          name: element.getAttribute('name') || '',
          type: 'Exit',
          subtype: 'Exit',
          attributes,
        },
      }
      exitNodes.push(exitNode)
      continue
    }

    const sourceHandles = extractSourceHandles(element)
    const frankNode: FrankNodeType = convertElementToNode(element, idCounter, sourceHandles)
    nodes.push(frankNode)
  }

  for (const exitNode of exitNodes) {
    exitNode.id = idCounter.current.toString()
    nodes.push(exitNode)
    idCounter.current++
  }

  return nodes
}

function convertElementToNode(element: Element, idCounter: IdCounter, sourceHandles: SourceHandle[]): FrankNodeType {
  const thisId = (idCounter.current++).toString()
  // Extract attributes for this element except "name"
  const attributes: Record<string, string> = {}
  for (const attribute of element.attributes) {
    if (attribute.name !== 'name') {
      attributes[attribute.name] = attribute.value
    }
  }

  const frankNode: FrankNodeType = {
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

function convertChildren(elements: Element[], idCounter: IdCounter): ChildNode[] {
  return elements
    .filter((child) => child.tagName !== 'Forward')
    .map((child) => {
      const childAttributes: Record<string, string> = {}
      const childId = (idCounter.current++).toString()
      for (const attribute of child.attributes) {
        if (attribute.name !== 'name') {
          childAttributes[attribute.name] = attribute.value
        }
      }

      return {
        id: childId,
        name: child.getAttribute('name') || undefined,
        subtype: child.tagName,
        type: getElementTypeFromName(child.tagName),
        attributes: Object.keys(childAttributes).length > 0 ? childAttributes : undefined,
        children: convertChildren([...child.children], idCounter),
      }
    })
}

function findSuccessExit(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find((node) => {
    if (node.type !== 'exitNode') return false

    const data = node.data
    if (typeof data !== 'object' || data === null) return false

    // Check for 'name' directly (case-insensitive)
    if ('name' in data && typeof data.name === 'string' && data.name.toLowerCase() === 'success') {
      return true
    }

    // Check for 'state' inside attributes if it exists (case-insensitive)
    if ('attributes' in data && data.attributes && typeof data.attributes === 'object') {
      const attrs = data.attributes as Record<string, string>
      const state = attrs['state']
      return state.toLowerCase() === 'success'
    }

    return false
  })
}

function isNodeTargeted(nodeId: string, edges: FrankEdge[]): boolean {
  return edges.some((edge) => edge.target === nodeId)
}

interface FrankEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  type: 'frankEdge'
}
