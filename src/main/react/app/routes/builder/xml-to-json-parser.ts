import type { FlowNode } from '~/routes/builder/canvas/flow'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'
import type { ExitNode } from '~/routes/builder/canvas/nodetypes/exit-node'
import type { FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node'

export async function getXmlString(filename: string): Promise<string> {
  try {
    const response = await fetch(`/configurations/${filename}`)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const xmlString = await response.text()
    return xmlString
  } catch (error) {
    throw new Error(`Failed to fetch XML file: ${error}`)
  }
}

export async function convertXmlToJson(filename: string) {
  const xmlString = await getXmlString(filename)
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

  const adapterList = xmlDoc.querySelectorAll('Adapter')
  const nodes = convertAdapterToFlowNodes(adapterList[2])
  const edges = extractEdgesFromAdapter(adapterList[2], nodes)

  return { nodes: nodes, edges: edges }
}

function convertAdapterToFlowNodes(adapter: any): FlowNode[] {
  let elements: Element[] = []
  let nodes: FlowNode[] = []
  let exitNodes: ExitNode[] = []

  const receiverElements = adapter.querySelectorAll('Adapter > Receiver')
  for (const receiver of receiverElements) elements.push(receiver)

  const pipelineElement = adapter.querySelector('Pipeline')
  let firstPipeName = null
  if (pipelineElement) {
    firstPipeName = pipelineElement.getAttribute('firstPipe')
  }
  if (pipelineElement) {
    let pipeArray = [...pipelineElement.children]

    if (firstPipeName) {
      const firstPipeIndex = pipeArray.findIndex((pipe) => pipe.getAttribute('name') === firstPipeName)

      if (firstPipeIndex !== -1) {
        const [firstPipe] = pipeArray.splice(firstPipeIndex, 1)
        pipeArray.unshift(firstPipe)
      }
    }

    elements.push(...pipeArray)
  }

  let id = 0
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
    const forwardElements = [...element.querySelectorAll('Forward')]
    const sourceHandles =
      forwardElements.length > 0
        ? forwardElements.map((forward, index) => ({
            type: forward.getAttribute('name') || `forward${index + 1}`,
            index: index + 1,
          }))
        : [
            {
              type: 'success',
              index: 1,
            },
          ]

    const frankNode: FrankNode = convertElementToNode(element, id, sourceHandles)
    nodes.push(frankNode)
    id++
  }

  // Now assign IDs to exitNodes starting from current id
  for (const exitNode of exitNodes) {
    exitNode.id = id.toString()
    nodes.push(exitNode)
    id++
  }

  return nodes
}

function convertElementToNode(element: Element, id: number, sourceHandles: any): FrankNode {
  // Extract attributes for this element except "name"
  const attributes: Record<string, string> = {}
  for (const attribute of element.attributes) {
    if (attribute.name !== 'name') {
      attributes[attribute.name] = attribute.value
    }
  }

  const frankNode: FrankNode = {
    id: id.toString(),
    type: 'frankNode',
    position: { x: 0, y: 0 },
    data: {
      name: element.getAttribute('name') || '',
      type: getElementTypeFromName(element.tagName),
      subtype: element.tagName,
      children: convertChildren([...element.children]),
      sourceHandles,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    },
  }

  return frankNode
}

function convertChildren(elements: Element[]): any[] {
  return elements
    .filter((child) => child.tagName !== 'Forward') // skip 'Forward' elements
    .map((child) => {
      // Extract child's attributes except 'name'
      const childAttributes: Record<string, string> = {}
      for (const attribute of child.attributes) {
        if (attribute.name !== 'name') {
          childAttributes[attribute.name] = attribute.value
        }
      }

      return {
        name: child.getAttribute('name'),
        subtype: child.tagName,
        type: getElementTypeFromName(child.tagName),
        attributes: Object.keys(childAttributes).length > 0 ? childAttributes : undefined,
        children: convertChildren([...child.children]),
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

function extractEdgesFromAdapter(adapter: Element, nodes: FlowNode[]): FrankEdge[] {
  const edges: FrankEdge[] = []
  const pipelineElement = adapter.querySelector('Pipeline')
  if (!pipelineElement) return edges

  // Map node names to their IDs
  const nameToId = new Map<string, string>()
  for (const node of nodes) {
    if ('name' in node.data && typeof node.data.name === 'string') {
      nameToId.set(node.data.name, node.id)
    }
  }

  // Track which nodes already have custom forwards
  const nodesWithExplicitTargets = new Set<string>()
  const forwardIndexBySourceId = new Map<string, number>()

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

      // Assign a numeric sourceHandle per forward per source node
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

  // Fallback: connect sequential nodes unless current is an exitNode or has explicit forwards
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

  return edges
}
