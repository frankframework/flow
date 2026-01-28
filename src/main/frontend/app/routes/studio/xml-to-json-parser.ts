import type { FlowNode } from '~/routes/studio/canvas/flow'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import type { ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import type { FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import { SAXParser } from 'sax-ts'
import type { ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'
import { fetchConfiguration } from '~/services/configuration-service'

interface IdCounter {
  current: number
}

interface SourceHandle {
  type: string
  index: number
}

export async function getXmlString(projectName: string, filepath: string): Promise<string> {
  return fetchConfiguration(projectName, filepath)
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

function processExplicitForwards(
  pipelineElement: Element,
  nameToId: Map<string, string>,
  edges: FrankEdge[],
  nodesWithExplicitTargets: Set<string>,
  forwardIndexBySourceId: Map<string, number>,
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
      if (!targetId) {
        console.warn(`Target node with name "${targetName}" not found.`)
        continue
      }

      const currentIndex = forwardIndexBySourceId.get(sourceId) ?? 1
      forwardIndexBySourceId.set(sourceId, currentIndex + 1)

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'frankEdge',
        sourceHandle: currentIndex.toString(),
      })

      nodesWithExplicitTargets.add(sourceId)
    }
  }
}

function addSequentialFallbackEdges(nodes: FlowNode[], edges: FrankEdge[], nodesWithExplicitTargets: Set<string>) {
  for (let index = 0; index < nodes.length - 1; index++) {
    const current = nodes[index]
    const next = nodes[index + 1]

    if (current.type === 'exitNode') continue
    if (nodesWithExplicitTargets.has(current.id)) continue

    edges.push({
      id: `${current.id}-${next.id}`,
      source: current.id,
      target: next.id,
      type: 'frankEdge',
      sourceHandle: '1',
    })
  }
}

function extractEdgesFromAdapter(adapter: Element, nodes: FlowNode[]): FrankEdge[] {
  const edges: FrankEdge[] = []
  const pipelineElement = adapter.querySelector('Pipeline')
  if (!pipelineElement) return edges

  const nameToId = buildNodeNameToIdMap(nodes)
  const nodesWithExplicitTargets = new Set<string>()
  const forwardIndexBySourceId = new Map<string, number>()

  processExplicitForwards(pipelineElement, nameToId, edges, nodesWithExplicitTargets, forwardIndexBySourceId)
  addSequentialFallbackEdges(nodes, edges, nodesWithExplicitTargets)

  return edges
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
  if (forwardElements.length === 0) {
    return [{ type: 'success', index: 1 }]
  }

  return forwardElements.map((forward, index) => {
    const path = forward.getAttribute('path') || ''
    const loweredPath = path.toLowerCase()
    const type: string =
      loweredPath.includes('error') || loweredPath.includes('bad') || loweredPath.includes('fail')
        ? 'failure'
        : 'success'

    return { type, index: index + 1 }
  })
}

function processExitElements(element: Element, exitNodes: ExitNode[]) {
  const exits = [...element.children]
  for (const exit of exits) {
    const exitNode: ExitNode = {
      id: '',
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

interface FrankEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  type: 'frankEdge'
}
