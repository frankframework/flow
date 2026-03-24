import type { FlowNode } from '~/routes/studio/canvas/flow'
import type { Edge } from '@xyflow/react'
import type { ChildNode } from './canvas/nodetypes/child-node'
import { getAdapter } from '~/services/adapter-service'
import { FlowConfig } from './canvas/flow.config'
import { isGroupNode, isStickyNote } from '~/stores/flow-store'
import type { GroupNode } from './canvas/nodetypes/group-node'

interface ReactFlowJson {
  nodes: FlowNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

interface NodeData {
  subtype: string
  type: string
  name: string
  attributes?: Record<string, string>
  sourceHandles?: []
  children?: ChildNode[]
}

function hasDataProperty(node: FlowNode): node is Extract<FlowNode, { data: NodeData }> {
  return (node as FlowNode).data != undefined
}

function escapeXml(string_: string): string {
  return string_.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

export async function exportFlowToXml(
  json: ReactFlowJson,
  projectName: string,
  configurationPath: string,
  adapterName: string,
  existingAdapterXml?: string,
): Promise<string> {
  const adapterXml: string =
    existingAdapterXml === undefined
      ? await getAdapter(projectName, adapterName, configurationPath).then((response) => response.xmlContent)
      : existingAdapterXml
  const adapterAttributes = getAdapterAttributes(adapterXml)

  const { nodes, edges } = json
  const validNodes = nodes.filter((node) => hasDataProperty(node))
  const nodeMap = new Map(validNodes.map((n) => [n.id, n]))

  const { outgoing, incoming, edgeMap } = buildEdgeMaps(edges)

  const receiverNodes = validNodes.filter((n) => n.data.type?.toLowerCase() === 'receiver')
  const startNodes = receiverNodes.filter((n) => !incoming[n.id])
  let sortedIds: string[]
  if (startNodes.length > 0) {
    sortedIds = topologicalSort(
      startNodes.map((n) => n.id),
      outgoing,
    )

    const sortedSet = new Set(sortedIds)
    const unconnectedIds = validNodes.map((n) => n.id).filter((id) => !sortedSet.has(id))
    sortedIds = [...sortedIds, ...unconnectedIds]
  } else {
    sortedIds = validNodes.map((node) => node.id)
  }

  const exitNodes = validNodes.filter((n) => n.data.type?.toLowerCase() === 'exit')
  const exitNodeIds = new Set(exitNodes.map((n) => n.id))

  const receivers: string[] = []
  const pipelineParts: string[] = []

  for (const id of sortedIds) {
    const node = nodeMap.get(id)
    if (!node) continue

    const type = node.data.type?.toLowerCase()
    if (type === 'receiver') {
      receivers.push(generateXmlElement(node, edgeMap, exitNodeIds, nodeMap))
    } else if (type === 'pipe') {
      pipelineParts.push(generateXmlElement(node, edgeMap, exitNodeIds, nodeMap))
    }
  }

  const exitsXml = exitNodes.length > 0 ? `      <Exits>\n${generateExitsXml(exitNodes)}\n      </Exits>` : ''
  const flowXml = generateFlowElementsXml(nodes)

  return `
  <Adapter ${adapterAttributes}>
${receivers.join('\n')}
    <Pipeline>
${exitsXml}
${pipelineParts.join('\n')}
    </Pipeline>
    ${flowXml}
  </Adapter>`
}

function buildEdgeMaps(edges: Edge[]) {
  const outgoing: Record<string, string[]> = {}
  const incoming: Record<string, string[]> = {}
  const edgeMap = new Map<string, { targetId: string; label: string }[]>()

  for (const edge of edges) {
    if (!outgoing[edge.source]) outgoing[edge.source] = []
    if (!incoming[edge.target]) incoming[edge.target] = []
    outgoing[edge.source].push(edge.target)
    incoming[edge.target].push(edge.source)

    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, [])
    edgeMap.get(edge.source)!.push({
      targetId: edge.target,
      label:
        typeof edge.data === 'object' && edge.data && 'label' in edge.data && typeof edge.data.label === 'string'
          ? edge.data.label
          : 'success',
    })
  }

  return { outgoing, incoming, edgeMap }
}

function getAdapterAttributes(adapterXml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(adapterXml, 'application/xml')
  const adapterElement = doc.documentElement
  return [...adapterElement.attributes].map((attr) => `${attr.name}="${attr.value}"`).join(' ')
}

function topologicalSort(startNodes: string[], outgoing: Record<string, string[]>): string[] {
  const visited = new Set<string>()
  const sorted: string[] = []

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    for (const target of outgoing[nodeId] || []) {
      dfs(target)
    }
    sorted.push(nodeId)
  }

  for (const startId of startNodes) {
    dfs(startId)
  }

  return sorted.toReversed()
}

function generateXmlElement(
  node: FlowNode,
  edgeMap: Map<string, { targetId: string; label: string }[]>,
  exitNodeIds: Set<string>,
  nodeMap: Map<string, FlowNode>,
): string {
  const { subtype, name } = node.data as NodeData
  const { x, y } = node.position
  const roundedX = Math.round(x)
  const roundedY = Math.round(y)
  let width = FlowConfig.NODE_DEFAULT_WIDTH
  let height = FlowConfig.NODE_DEFAULT_HEIGHT
  if (node.measured && node.measured.width && node.measured.height) {
    width = node.measured.width
    height = node.measured.height
  }
  const attributes = (node.data as NodeData).attributes || {}
  const children = (node.data as NodeData).children || []

  const attributeString = ` name="${escapeXml(name)}"${Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join('')}`

  const flowNamespaceString = `flow:y="${roundedY}" flow:x="${roundedX}" flow:width="${width}" flow:height="${height}"`

  const childXml = children.map((child: ChildNode) => generateChildXml(child, 4)).join('\n')

  const forwards = (edgeMap.get(node.id) || [])
    .map(({ label, targetId }) => {
      const forwardTarget = nodeMap.get(targetId)
      const targetName = (forwardTarget?.data as NodeData)?.name || ''
      if (targetName === '') {
        console.warn(`Target node with ID ${targetId} does not have a name attribute.`)
        return ''
      }
      // If saving from flow to xml, all edges will be considered explicit Forwards.
      return `    <Forward name="${escapeXml(label)}" path="${escapeXml(targetName)}" />`
    })
    .join('\n')

  const content = [childXml, forwards].filter(Boolean).join('\n')
  return content
    ? `  <${subtype}${attributeString} ${flowNamespaceString} >\n${content}\n  </${subtype}>`
    : `  <${subtype}${attributeString} ${flowNamespaceString} />`
}

function generateChildXml(child: ChildNode, indent: number): string {
  const spaces = ' '.repeat(indent)

  const attributes =
    (child.name ? ` name="${escapeXml(child.name)}"` : '') +
    Object.entries(child.attributes || {})
      .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
      .join('')

  const hasChildren = child.children && child.children.length > 0

  if (!hasChildren) {
    return `${spaces}<${child.subtype}${attributes}/>`
  }

  // Recursive case
  const childXmlStrings = child.children!.map((nested) => generateChildXml(nested, indent + 2))

  return `${spaces}<${child.subtype}${attributes}>
${childXmlStrings.join('\n')}
${spaces}</${child.subtype}>`
}

function generateExitsXml(exitNodes: FlowNode[]): string {
  return exitNodes
    .map((node) => {
      const data = node.data as NodeData
      const { x, y } = node.position
      const roundedX = Math.round(x)
      const roundedY = Math.round(y)
      let width = FlowConfig.EXIT_DEFAULT_WIDTH
      let height = FlowConfig.EXIT_DEFAULT_HEIGHT
      if (node.measured && node.measured.width && node.measured.height) {
        width = node.measured.width
        height = node.measured.height
      }
      const name = escapeXml(data.name)
      const state = getExitState(data)
      const flowNamespaceString = `flow:y="${roundedY}" flow:x="${roundedX}" flow:width="${width}" flow:height="${height}"`

      return `      <Exit name="${name}" state="${state}" ${flowNamespaceString} />`
    })
    .join('\n')
}

function getExitState(data: NodeData): string {
  const storedState = data.attributes?.state
  if (storedState) return storedState

  const name = data.name.toLowerCase()
  return name.includes('bad') || name.includes('fail') ? 'error' : 'success'
}

function generateFlowElementsXml(nodes: FlowNode[]): string {
  const stickyNotes = nodes.filter((node) => isStickyNote(node))
  const groupNodes = nodes.filter((node) => isGroupNode(node))

  const groupChildrenMap = new Map<string, FlowNode[]>()

  for (const node of nodes) {
    if (!node.parentId) continue

    if (!groupChildrenMap.has(node.parentId)) {
      groupChildrenMap.set(node.parentId, [])
    }

    groupChildrenMap.get(node.parentId)!.push(node)
  }

  const stickyXml = stickyNotes.map((stickynote) => {
    const { x, y } = stickynote.position
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    const text = stickynote.data?.content || ''

    return `    <flow:StickyNote
      text="${escapeXml(text)}"
      flow:x="${roundedX}"
      flow:y="${roundedY}"
      flow:width="${stickynote.measured?.width || FlowConfig.STICKY_NOTE_DEFAULT_WIDTH}"
      flow:height="${stickynote.measured?.height || FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT}"
    />`
  })

  const groupNodesXml = generateGroupNodeXml(groupNodes, groupChildrenMap)

  const allElements = [...stickyXml, ...groupNodesXml]

  if (allElements.length === 0) return ''

  return `
  <flow:FlowElements>
${allElements.join('\n')}
  </flow:FlowElements>`
}

function generateGroupNodeXml(groupNodes: GroupNode[], groupChildrenMap: Map<string, FlowNode[]>): string[] {
  const groupNodesXml = groupNodes.map((groupNode) => {
    const { x, y } = groupNode.position
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    const width = groupNode.measured?.width || FlowConfig.NODE_DEFAULT_WIDTH
    const height = groupNode.measured?.height || FlowConfig.NODE_DEFAULT_HEIGHT

    const children = groupChildrenMap.get(groupNode.id) || []

    const childNames = children
      .map((child) => (child.data as NodeData)?.name)
      .filter((name) => name && name.trim() !== '')
      .map((name) => escapeXml(name))
      .join(',')

    const groupName = escapeXml(groupNode.data?.label || '')

    return `    <flow:GroupNode
      label="${groupName}"
      children="${childNames}"
      flow:x="${roundedX}"
      flow:y="${roundedY}"
      flow:width="${width}"
      flow:height="${height}"
    />`
  })
  return groupNodesXml
}
