import type { FlowNode } from '~/routes/studio/canvas/flow'
import type { Edge } from '@xyflow/react'
import { ChildNode } from './canvas/nodetypes/child-node'

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

export function exportFlowToXml(json: ReactFlowJson, adaptername: string): string {
  const { nodes, edges } = json
  const validNodes = nodes.filter((node) => hasDataProperty(node))
  const nodeMap = new Map(validNodes.map((n) => [n.id, n]))

  const { outgoing, incoming, edgeMap } = buildEdgeMaps(edges)

  const receiverNodes = validNodes.filter((n) => n.data.type?.toLowerCase() === 'receiver')
  const startNodes = receiverNodes.filter((n) => !incoming[n.id])
  const sortedIds =
    startNodes.length > 0
      ? topologicalSort(
          startNodes.map((n) => n.id),
          outgoing,
        )
      : validNodes.map((node) => node.id)

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

  console.log(`
  <Adapter name="${adaptername}" description="Auto-generated from React Flow JSON">
${receivers.join('\n')}
    <Pipeline>
${exitsXml}
${pipelineParts.join('\n')}
    </Pipeline>
  </Adapter>`)
  return `
  <Adapter name="${adaptername}" description="Auto-generated from React Flow JSON">
${receivers.join('\n')}
    <Pipeline>
${exitsXml}
${pipelineParts.join('\n')}
    </Pipeline>
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
      label: edge.data?.label || 'success',
    })
  }

  return { outgoing, incoming, edgeMap }
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

  return sorted.reverse()
}

function generateXmlElement(
  node: FlowNode,
  edgeMap: Map<string, { targetId: string; label: string }[]>,
  exitNodeIds: Set<string>,
  nodeMap: Map<string, FlowNode>,
): string {
  const { subtype, name } = node.data as NodeData
  const attributes = (node.data as any).attributes || {}
  const children = (node.data as any).children || []

  const attributeString = ` name="${escapeXml(name)}"${Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join('')}`

  const childXml = children.map((child: ChildNode) => generateChildXml(child, 4)).join('\n')

  const forwards = (edgeMap.get(node.id) || [])
    .filter(({ targetId }) => exitNodeIds.has(targetId))
    .map(({ label, targetId }) => {
      const exitTarget = nodeMap.get(targetId)
      const exitName = (exitTarget?.data as NodeData).name || 'Exit'
      return `    <Forward name="${escapeXml(label)}" path="${escapeXml(exitName)}" />`
    })
    .join('\n')

  const content = [childXml, forwards].filter(Boolean).join('\n')
  return content ? `  <${subtype}${attributeString}>\n${content}\n  </${subtype}>` : `  <${subtype}${attributeString}/>`
}

function generateChildXml(child: ChildNode, indent: 4): string {
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
      const name = escapeXml((node.data as NodeData).name)
      const state = name.toLowerCase().includes('bad') || name.toLowerCase().includes('fail') ? 'error' : 'success'
      return `      <Exit name="${name}" state="${state}" />`
    })
    .join('\n')
}
