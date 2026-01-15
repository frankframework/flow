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

/**
 * Function that does a lot, but in summary does the following:
 * Extracts edges from an adapter, following the adapter edge generation rules:
 *
 * 1. Explicit Forward Edges
 *    - Every <Forward> element always generates an edge from the current node
 *      to the specified target node.
 *
 * 2. Receiver -> First Pipeline Node
 *    - All receivers in the adapter automatically generate an edge to the first
 *      node in the pipeline, ensuring that incoming messages flow into the pipeline.
 *
 * 3. Implicit Pipeline Edges (Fallbacks)
 *    - For nodes in the pipeline, edges are generated top-to-bottom to simulate
 *      the natural flow.
 *    - Skip creating an implicit edge if the current node has a <Forward> that:
 *        a) Points to any other pipeline node, or
 *        b) Points to an exit node with state="SUCCESS"
 *
 * 4. Implicit Success Exit Edge
 *    - If a SUCCESS exit exists and the last pipeline node does not have a <Forward>
 *      to any exit, an implicit edge is created from the last pipeline node to
 *      the SUCCESS exit.
 *
 * @param adapter The XML Element representing the adapter
 * @param nodes The FlowNode array representing all nodes in the adapter
 * @returns An array of FrankEdge objects representing all generated edges
 */
function extractEdgesFromAdapter(adapter: Element, nodes: FlowNode[]): FrankEdge[] {
  const pipelineElement = adapter.querySelector('Pipeline')
  if (!pipelineElement) return []

  const edges: FrankEdge[] = []
  const nameToId = buildNodeNameToIdMap(nodes)
  const forwardIndexBySourceId = new Map<string, number>()
  const explicitTargetsBySourceId = new Map<string, Set<string>>()
  const sourcesWithSuccessExitForward = new Set<string>()

  addExplicitForwardEdges(
    pipelineElement,
    nameToId,
    nodes,
    edges,
    forwardIndexBySourceId,
    explicitTargetsBySourceId,
    sourcesWithSuccessExitForward,
  )

  addReceiverToFirstPipeEdges(adapter, nodes, edges, forwardIndexBySourceId)

  addSequentialFallbackEdges(
    nodes,
    edges,
    forwardIndexBySourceId,
    explicitTargetsBySourceId,
    sourcesWithSuccessExitForward,
  )

  addImplicitSuccessExitEdge(nodes, edges, forwardIndexBySourceId)

  return edges
}

function addExplicitForwardEdges(
  pipelineElement: Element,
  nameToId: Map<string, string>,
  nodes: FlowNode[],
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
  explicitTargetsBySourceId: Map<string, Set<string>>,
  sourcesWithSuccessExitForward: Set<string>,
) {
  const pipelineChildren = [...pipelineElement.children]

  for (const element of pipelineChildren) {
    const sourceName = element.getAttribute('name')
    if (!sourceName) continue

    const sourceId = nameToId.get(sourceName)
    if (!sourceId) continue

    const forwards = element.querySelectorAll('Forward')
    addForwardEdges(
      forwards,
      sourceId,
      nodes,
      edges,
      forwardIndexBySourceId,
      explicitTargetsBySourceId,
      sourcesWithSuccessExitForward,
    )
  }
}

/**
 * Handles creating edges from a set of <Forward> elements
 */
function addForwardEdges(
  forwards: NodeListOf<Element>,
  sourceId: string,
  nodes: FlowNode[],
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
  explicitTargetsBySourceId: Map<string, Set<string>>,
  sourcesWithSuccessExitForward: Set<string>,
) {
  for (const forward of forwards) {
    const targetName = forward.getAttribute('path')
    if (!targetName) continue

    const targetNode = nodes.find((n) => n.data && 'name' in n.data && n.data.name === targetName)
    if (!targetNode) continue

    const handleIndex = forwardIndexBySourceId.get(sourceId) ?? 1
    forwardIndexBySourceId.set(sourceId, handleIndex + 1)

    edges.push({
      id: `${sourceId}-${targetNode.id}-${handleIndex}`,
      source: sourceId,
      target: targetNode.id,
      type: 'frankEdge',
      sourceHandle: handleIndex.toString(),
    })

    if (!explicitTargetsBySourceId.has(sourceId)) {
      explicitTargetsBySourceId.set(sourceId, new Set())
    }
    explicitTargetsBySourceId.get(sourceId)!.add(targetNode.id)

    if (targetNode.type === 'exitNode' && isSuccessExit(targetNode)) {
      sourcesWithSuccessExitForward.add(sourceId)
    }
  }
}

function addReceiverToFirstPipeEdges(
  adapter: Element,
  nodes: FlowNode[],
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
) {
  // Find all receivers
  const receivers = nodes.filter((n): n is FrankNodeType => isFrankNode(n) && n.data.type === 'receiver')

  if (receivers.length === 0) return

  // Find first pipe in the pipeline (exclude exitNodes and receivers)
  const firstPipe = nodes.find(
    (n): n is FrankNodeType => isFrankNode(n) && n.data.type !== 'receiver' && n.type !== 'exitNode',
  )
  if (!firstPipe) return

  for (const receiver of receivers) {
    const handleIndex = forwardIndexBySourceId.get(receiver.id) ?? 1
    forwardIndexBySourceId.set(receiver.id, handleIndex + 1)

    edges.push({
      id: `${receiver.id}-${firstPipe.id}-${handleIndex}`,
      source: receiver.id,
      target: firstPipe.id,
      type: 'frankEdge',
      sourceHandle: handleIndex.toString(),
    })
  }
}

function addSequentialFallbackEdges(
  nodes: FlowNode[],
  edges: FrankEdge[],
  forwardIndexBySourceId: Map<string, number>,
  explicitTargetsBySourceId: Map<string, Set<string>>,
  sourcesWithSuccessExitForward: Set<string>,
) {
  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i]
    // skip exit nodes
    if (current.type === 'exitNode') continue
    // skip receivers (they already get edges to first pipeline pipe)
    if (isFrankNode(current) && current.data.type === 'receiver') continue

    // find next NON-exit node
    const next = nodes.slice(i + 1).find((n) => n.type !== 'exitNode')
    if (!next) continue

    // Block fallback if pipe explicitly forwards to another pipe
    if (hasExplicitPipeForward(current.id, explicitTargetsBySourceId, nodes)) continue

    // Block fallback if pipe explicitly forwards to SUCCESS exit
    if (sourcesWithSuccessExitForward.has(current.id)) continue

    const explicitTargets = explicitTargetsBySourceId.get(current.id)
    if (explicitTargets?.has(next.id)) continue

    const handleIndex = forwardIndexBySourceId.get(current.id) ?? 1
    forwardIndexBySourceId.set(current.id, handleIndex + 1)

    edges.push({
      id: `${current.id}-${next.id}-${handleIndex}`,
      source: current.id,
      target: next.id,
      sourceHandle: handleIndex.toString(),
      type: 'frankEdge',
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

  // No forwards? Create a single implicit success handle
  if (forwardElements.length === 0) {
    return [{ type: 'success', index: 1 }]
  }

  const handles: SourceHandle[] = forwardElements.map((forward, index) => {
    const name = forward.getAttribute('name')?.trim()

    return {
      type: name && name.length > 0 ? name : 'success',
      index: index + 1,
    }
  })

  // Check if any forward represents SUCCESS
  const hasSuccessForward = forwardElements.some((forward) => {
    const name = forward.getAttribute('name')?.toUpperCase()
    return name === 'SUCCESS'
  })

  // If not, add implicit fallback handle
  if (!hasSuccessForward) {
    handles.push({
      type: 'success',
      index: handles.length + 1,
    })
  }

  return handles
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

// ----------------------------------------------------------------------------- HELPERS -----------------------------------------------------------------------------
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

function isSuccessExit(node: FlowNode): boolean {
  if (node.type !== 'exitNode') return false

  const data = node.data
  if (!data || typeof data !== 'object') return false

  if ('attributes' in data && data.attributes) {
    const state = (data.attributes as Record<string, string>).state
    return state?.toUpperCase() === 'SUCCESS'
  }

  return false
}

function hasExplicitPipeForward(
  sourceId: string,
  explicitTargetsBySourceId: Map<string, Set<string>>,
  nodes: FlowNode[],
): boolean {
  const targets = explicitTargetsBySourceId.get(sourceId)
  if (!targets) return false

  return [...targets].some((targetId) => nodes.some((n) => n.id === targetId && n.type === 'frankNode'))
}

function isNodeTargeted(nodeId: string, edges: FrankEdge[]): boolean {
  return edges.some((edge) => edge.target === nodeId)
}

function isFrankNode(node: FlowNode): node is FrankNodeType {
  return node.type === 'frankNode' && node.data !== undefined && 'type' in node.data
}

interface FrankEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  type: 'frankEdge'
}
