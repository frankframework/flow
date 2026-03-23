import type { FlowNode } from '~/routes/studio/canvas/flow'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import type { ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import type { FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import type { ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'
import { fetchConfigurationCached } from '~/services/configuration-service'
import { translateElementFromOldToNewFormat } from '~/utils/flow-utils'
import { FlowConfig } from './canvas/flow.config'
import type { StickyNote } from './canvas/nodetypes/sticky-note'
import type { GroupNode } from './canvas/nodetypes/group-node'

interface IdCounter {
  current: number
}

interface SourceHandle {
  type: string
  index: number
}

export interface AdapterInfo {
  name: string
  listenerType: string | null
}

export async function getAdaptersFromConfiguration(projectName: string, filepath: string): Promise<AdapterInfo[]> {
  const xmlString = await fetchConfigurationCached(projectName, filepath)
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

  const adapters: AdapterInfo[] = []
  const adapterElements = xmlDoc.querySelectorAll('Adapter, adapter')

  for (const adapter of adapterElements) {
    const name = adapter.getAttribute('name')
    if (!name) continue

    let listenerType: string | null = null
    const children = adapter.querySelectorAll('*')
    for (const child of children) {
      if (child.tagName.includes('Listener') || child.tagName.includes('listener')) {
        listenerType = child.tagName
        break
      }
    }

    adapters.push({ name, listenerType })
  }

  return adapters
}

export async function getAdapterNamesFromConfiguration(projectName: string, filepath: string): Promise<string[]> {
  const adapters = await getAdaptersFromConfiguration(projectName, filepath)
  return adapters.map((a) => a.name)
}

export async function getAdapterFromConfiguration(
  projectname: string,
  filename: string,
  adapterName: string,
  adapterPosition?: number,
): Promise<Element | null> {
  const xmlString = await fetchConfigurationCached(projectname, filename)
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

  const adapterList = [...xmlDoc.querySelectorAll('Adapter, adapter')]

  if (adapterPosition !== undefined) {
    return adapterList[adapterPosition] ?? null
  }

  return adapterList.find((a) => a.getAttribute('name') === adapterName) ?? null
}

export async function getAdapterListenerType(
  projectName: string,
  filename: string,
  adapterName: string,
  adapterPosition?: number,
): Promise<string | null> {
  const adapterElement = await getAdapterFromConfiguration(projectName, filename, adapterName, adapterPosition)
  if (!adapterElement) return null
  // Look through all child elements inside the adapter
  const children = adapterElement.querySelectorAll('*')
  for (const child of children) {
    if (child.tagName.includes('Listener') || child.tagName.includes('listener')) {
      const { subtype } = translateElementFromOldToNewFormat(child)
      return subtype // Return the tag name, e.g., "JavaListener"
    }
  }

  // No listener element found
  return null
}

export async function convertAdapterXmlToJson(adapter: Element) {
  const idCounter: IdCounter = { current: 0 }
  const flownodes = convertAdapterToFlowNodes(adapter, idCounter)
  const stickyNotes = extractStickyNotesFromAdapter(adapter, idCounter)
  const groupnodes = extractGroupNodesFromAdapter(adapter, idCounter)
  const allNodes: FlowNode[] = [...flownodes, ...stickyNotes]
  const adapterJson = { nodes: allNodes, edges: extractEdgesFromAdapter(adapter, flownodes) }

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
  const pipelineElement = [...adapter.children].find((el) => el.tagName.toLowerCase() === 'pipeline') || null

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

  addReceiverToFirstPipeEdges(nodes, edges, forwardIndexBySourceId)

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

    const forwards = [...element.querySelectorAll('Forward'), ...element.querySelectorAll('forward')]

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
  forwards: Element[],
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

    const label = forward.getAttribute('name')?.trim() || 'success'

    edges.push({
      id: `${sourceId}-${targetNode.id}-${handleIndex}`,
      source: sourceId,
      target: targetNode.id,
      type: 'frankEdge',
      sourceHandle: handleIndex.toString(),
      data: { label },
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
      data: { label: 'success' },
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
      data: { label: 'success' },
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
    data: { label: 'success' },
  })
}

function collectPipelineElements(adapter: Element): Element[] {
  const elements: Element[] = []
  const receiverElements = [
    ...adapter.querySelectorAll(':scope > Receiver'),
    ...adapter.querySelectorAll(':scope > receiver'),
  ]

  for (const receiver of receiverElements) elements.push(receiver)

  const pipelineElement = [...adapter.children].find((el) => el.tagName.toLowerCase() === 'pipeline') || null

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
  let forwardElements = [...element.querySelectorAll('Forward')]

  // Check if forwards are lower case instead
  if (forwardElements.length === 0) {
    forwardElements = [...element.querySelectorAll('forward')]
    // No forwards? Create a single implicit success handle
    if (forwardElements.length === 0) {
      return [{ type: 'success', index: 1 }]
    }
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
    const { attributes, name, x, y, width, height } = parseElementAttributes(
      exit.attributes,
      FlowConfig.EXIT_DEFAULT_WIDTH,
      FlowConfig.EXIT_DEFAULT_HEIGHT,
    )

    const exitNode: ExitNode = {
      id: '',
      type: 'exitNode',
      position: { x, y },
      width,
      height,
      data: {
        name,
        type: 'Exit',
        subtype: 'Exit',
        attributes,
      },
    }
    exitNodes.push(exitNode)
  }
}

function convertAdapterToFlowNodes(adapter: Element, idCounter: IdCounter): FlowNode[] {
  const nodes: FlowNode[] = []
  const exitNodes: ExitNode[] = []
  const elements = collectPipelineElements(adapter)

  for (const element of elements) {
    if (element.tagName.toLowerCase() === 'exits') {
      processExitElements(element, exitNodes)
      continue
    }
    if (element.tagName.toLowerCase() === 'exit') {
      const { attributes, name, x, y, width, height } = parseElementAttributes(
        element.attributes,
        FlowConfig.EXIT_DEFAULT_WIDTH,
        FlowConfig.EXIT_DEFAULT_HEIGHT,
      )

      const exitNode: ExitNode = {
        id: '',
        type: 'exitNode',
        position: { x, y },
        width,
        height,
        data: {
          name,
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
  const { subtype, usedClassName } = translateElementFromOldToNewFormat(element)

  const { attributes, name, x, y, width, height } = parseElementAttributes(
    element.attributes,
    FlowConfig.NODE_DEFAULT_WIDTH,
    FlowConfig.NODE_DEFAULT_HEIGHT,
    usedClassName,
  )

  const frankNode: FrankNodeType = {
    id: thisId,
    type: 'frankNode',
    position: { x, y },
    width,
    height,
    data: {
      name,
      type: getElementTypeFromName(subtype),
      subtype,
      children: convertChildren([...element.children], idCounter),
      sourceHandles,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    },
  }

  return frankNode
}

function convertChildren(elements: Element[], idCounter: IdCounter): ChildNode[] {
  return elements
    .filter((child) => child.tagName.toLowerCase() !== 'forward')
    .map((child) => {
      const childId = (idCounter.current++).toString()
      const { subtype, usedClassName } = translateElementFromOldToNewFormat(child)

      const childAttributes: Record<string, string> = {}
      for (const attribute of child.attributes) {
        if (attribute.name !== 'name' && !(usedClassName && attribute.name === 'className')) {
          childAttributes[attribute.name] = attribute.value
        }
      }

      return {
        id: childId,
        name: child.getAttribute('name') || undefined,
        subtype: subtype,
        type: getElementTypeFromName(subtype),
        attributes: Object.keys(childAttributes).length > 0 ? childAttributes : undefined,
        children: convertChildren([...child.children], idCounter),
      }
    })
}

function extractStickyNotesFromAdapter(adapter: Element, idCounter: IdCounter): StickyNote[] {
  const stickyNotes: StickyNote[] = []

  const elementContainer = [...adapter.children].find(
    (element) => element.tagName === 'flow:FlowElements' || element.tagName.toLowerCase().includes('stickynotes'),
  )

  if (!elementContainer) return stickyNotes

  const notes = [...elementContainer.children].filter(
    (element) => element.tagName === 'flow:StickyNote' || element.tagName.toLowerCase().includes('stickynote'),
  )

  for (const note of notes) {
    const text = note.getAttribute('text') || ''

    const x = Number(note.getAttribute('flow:x')) || 0
    const y = Number(note.getAttribute('flow:y')) || 0
    const width = Number(note.getAttribute('flow:width')) || FlowConfig.STICKY_NOTE_DEFAULT_WIDTH
    const height = Number(note.getAttribute('flow:height')) || FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT

    const sticky: StickyNote = {
      id: (idCounter.current++).toString(),
      type: 'stickyNote',
      position: { x, y },
      width,
      height,
      data: {
        content: text,
      },
    }

    stickyNotes.push(sticky)
  }

  return stickyNotes
}

function extractGroupNodesFromAdapter(adapter: Element, idCounter: IdCounter): GroupNode[] {
  const groupNodes: GroupNode[] = []

  const elementContainer = [...adapter.children].find(
    (element) => element.tagName === 'flow:FlowElements' || element.tagName.toLowerCase().includes('groupnodes'),
  )

  if (!elementContainer) return groupNodes

  const nodes = [...elementContainer.children].filter(
    (element) => element.tagName === 'flow:GroupNode' || element.tagName.toLowerCase().includes('groupnode'),
  )

  for (const node of nodes) {
    const label = node.getAttribute('label') || ''
    const children = node.getAttribute('children')?.split(',')
    const x = Number(node.getAttribute('flow:x')) || 0
    const y = Number(node.getAttribute('flow:y')) || 0
    const width = Number(node.getAttribute('flow:width'))
    const height = Number(node.getAttribute('flow:height'))

    console.log(children)
  }

  return groupNodes
}

// ----------------------------------------------------------------------------- HELPERS -----------------------------------------------------------------------------
function isSuccessExit(node: FlowNode): boolean {
  if (node.type !== 'exitNode') return false

  const data = node.data
  if (!data || typeof data !== 'object') return false

  if (!('attributes' in data) || typeof data.attributes !== 'object' || !data.attributes) {
    return false
  }

  const state = (data.attributes as Record<string, string>).state
  return state?.toLowerCase() === 'success'
}

function findSuccessExit(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find((node) => isSuccessExit(node))
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

function parseElementAttributes(
  attrs: NamedNodeMap,
  defaultWidth: number,
  defaultHeight: number,
  skipClassName = false,
): ParsedAttributes {
  const attributes: Record<string, string> = {}

  let name = ''
  let x = 0
  let y = 0
  let width = defaultWidth
  let height = defaultHeight

  for (const attr of attrs) {
    const attrName = attr.name
    const value = attr.value

    // Capture name attribute
    if (attrName === 'name') {
      name = value
      continue
    }

    // Optionally skip className
    if (skipClassName && attrName === 'className') continue

    // Flow coordinates
    if (attrName === 'flow:x') {
      x = Number(value) || 0
      continue
    }
    if (attrName === 'flow:y') {
      y = Number(value) || 0
      continue
    }

    // Flow size
    if (attrName === 'flow:width') {
      width = Number(value) || defaultWidth
      continue
    }
    if (attrName === 'flow:height') {
      height = Number(value) || defaultHeight
      continue
    }

    // Store all other attributes
    attributes[attrName] = value
  }

  return { attributes, name, x, y, width, height }
}

interface FrankEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  type: 'frankEdge'
  data: { label: string }
}

interface ParsedAttributes {
  attributes: Record<string, string>
  name: string
  x: number
  y: number
  width: number
  height: number
}
